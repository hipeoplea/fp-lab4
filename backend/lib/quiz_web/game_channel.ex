defmodule QuizWeb.GameChannel do
  use Phoenix.Channel

  alias Quiz.Games

  @impl true
  def join("game:" <> pin, params, socket) do
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

  def handle_in("submit_answer", %{"question_id" => qid, "choice_id" => cid}, %{assigns: %{session: session, player_id: player_id}} = socket) do
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
        {:ok, :host, assign(socket, :host, user), %{pin: session.pin}}

      _ ->
        nickname = Map.get(params, "nickname")
        token = Map.get(params, "player_token")

        cond do
          is_nil(nickname) || nickname == "" ->
            {:error, :nickname_required}

          true ->
            case Games.join_player(session.pin, nickname, token) do
              {:ok, player} ->
                resp = %{player_id: player.id, nickname: player.nickname, pin: session.pin}
                {:ok, :player, assign(socket, :player_id, player.id), resp}

              {:error, :not_in_lobby} ->
                {:error, :not_in_lobby}

              {:error, _changeset} ->
                {:error, :player_join_failed}
            end
        end
    end
  end
end
