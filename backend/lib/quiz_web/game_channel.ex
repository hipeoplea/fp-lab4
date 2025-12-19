defmodule QuizWeb.GameChannel do
  use Phoenix.Channel

  import Ecto.Query

  alias Quiz.{Games, Repo, SessionPlayer}
  alias Ecto.UUID
  alias QuizWeb.Endpoint

  @impl true
  def join("game:" <> pin, params, socket) do
    params = Map.merge(socket.assigns[:connect_params] || %{}, params)

    with {:ok, session} <- Games.fetch_session_by_pin(pin),
         {:ok, _} <- Games.ensure_running(session),
         {:ok, role, socket, resp} <- identify_and_register_player(session, params, socket) do
      {:ok, Map.put(resp, :role, role), assign(socket, :session, session) |> assign(:role, role)}
    else
      {:error, reason} -> {:error, %{reason: to_string(reason)}}
    end
  end

  @impl true
  def handle_in("host_start", _payload, %{assigns: %{session: session, role: :host}} = socket) do
    case Games.host_start(session.pin) do
      {:ok, payload} -> {:reply, {:ok, payload}, socket}
      {:error, reason} -> {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("next_question", _payload, %{assigns: %{session: session, role: :host}} = socket) do
    case Games.next_question(session.pin) do
      {:ok, payload} -> {:reply, {:ok, payload}, socket}
      {:error, reason} -> {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in(
        "submit_answer",
        %{"question_id" => qid, "choice_id" => cid},
        %{assigns: %{session: session, player_id: player_id}} = socket
      ) do
    case Games.submit_answer(session.pin, player_id, qid, cid) do
      {:ok, resp} -> {:reply, {:ok, resp}, socket}
      {:error, reason} -> {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in(_event, _payload, socket) do
    {:reply, {:error, %{reason: :unauthorized}}, socket}
  end

  defp identify_and_register_player(session, params, socket) do
    case socket.assigns[:current_user] do
      %{id: id} = user when id == session.host_id ->
        players = existing_players(session.id)
        send(self(), {:push_existing_players, players})
        {:ok, :host, assign(socket, :host, user), %{pin: session.pin, players: players}}

      _ ->
        nickname = Map.get(params, "nickname")
        token = params |> Map.get("player_token") |> normalize_player_token()

        cond do
          is_nil(nickname) || nickname == "" ->
            {:error, :nickname_required}

          true ->
            case Games.join_player(session.pin, nickname, token) do
              {:ok, player} ->
                notify_player_joined(session.pin, player)

                resp = %{
                  player_id: player.id,
                  nickname: player.nickname,
                  pin: session.pin,
                  player_token: player.player_token
                }

                socket =
                  socket
                  |> assign(:player_id, player.id)
                  |> assign(:player_nickname, player.nickname)

                {:ok, :player, socket, resp}

              {:error, :not_in_lobby} ->
                {:error, :not_in_lobby}

              {:error, _changeset} ->
                {:error, :player_join_failed}
            end
        end
    end
  end

  @impl true
  def handle_info({:push_existing_players, players}, socket) do
    Enum.each(players, &push(socket, "player_joined", &1))
    {:noreply, socket}
  end

  def handle_info(%Phoenix.Socket.Broadcast{event: event, payload: payload}, socket) do
    push(socket, event, payload)
    {:noreply, socket}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  @impl true
  def terminate(_reason, %{assigns: %{role: :player, session: session}} = socket) do
    payload =
      socket.assigns
      |> Map.take([:player_id, :player_nickname])
      |> Enum.reduce(%{}, fn
        {:player_id, nil}, acc -> acc
        {:player_id, id}, acc -> Map.put(acc, :player_id, id)
        {:player_nickname, nil}, acc -> acc
        {:player_nickname, nickname}, acc -> Map.put(acc, :nickname, nickname)
      end)

    Endpoint.broadcast("game:#{session.pin}", "player_left", payload)
    :ok
  end

  def terminate(_reason, _socket), do: :ok

  defp existing_players(session_id) do
    from(sp in SessionPlayer,
      where: sp.session_id == ^session_id,
      order_by: [asc: sp.created_at],
      select: %{player_id: sp.id, nickname: sp.nickname}
    )
    |> Repo.all()
  end

  defp notify_player_joined(pin, %{id: id, nickname: nickname}) do
    Endpoint.broadcast("game:#{pin}", "player_joined", %{player_id: id, nickname: nickname})
  end

  defp normalize_player_token(value) when value in [nil, "", "null", "undefined"], do: nil

  defp normalize_player_token(value) do
    case UUID.cast(value) do
      {:ok, uuid} -> uuid
      :error -> nil
    end
  end
end
