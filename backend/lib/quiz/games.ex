defmodule Quiz.Games do
  @moduledoc """
  Управление игровыми сессиями: создание PIN, запуск GameServer.
  """

  alias Quiz.{Repo, GameSession}
  alias Quiz.GameServer

  @pin_length 6
  @max_pin_attempts 5

  def create_session(host_id, quiz_id, attrs \\ %{}) do
    settings = Map.get(attrs, "settings") || Map.get(attrs, :settings) || %{}

    with {:ok, session} <-
           insert_with_pin(%{
             host_id: host_id,
             quiz_id: quiz_id,
             status: "lobby",
             settings: settings
           }),
         {:ok, _pid} <- GameServer.ensure_started(session) do
      {:ok, session}
    end
  end

  defp insert_with_pin(attrs, attempt \\ 1)

  defp insert_with_pin(_attrs, attempt) when attempt > @max_pin_attempts do
    {:error, :pin_generation_failed}
  end

  defp insert_with_pin(attrs, attempt) do
    pin = generate_pin()

    changeset =
      %GameSession{}
      |> GameSession.changeset(Map.put(attrs, :pin, pin))

    case Repo.insert(changeset) do
      {:ok, session} ->
        {:ok, session}

      {:error, changeset} ->
        if Keyword.has_key?(changeset.errors, :pin) do
          insert_with_pin(attrs, attempt + 1)
        else
          {:error, changeset}
        end
    end
  end

  defp generate_pin do
    1..@pin_length
    |> Enum.map(fn _ -> Enum.random(?0..?9) end)
    |> List.to_string()
  end

  def fetch_session_by_pin(pin) do
    with {:ok, normalized} <- normalize_pin(pin),
         %GameSession{} = session <- Repo.get_by(GameSession, pin: normalized) do
      {:ok, session}
    else
      _ -> {:error, :not_found}
    end
  end

  def ensure_running(%GameSession{} = session), do: GameServer.ensure_started(session)

  def join_player(pin, nickname, player_token) do
    GenServer.call(via(pin), {:join_player, nickname, player_token})
  end

  def host_start(pin) do
    GenServer.call(via(pin), :host_start)
  end

  def submit_answer(pin, player_id, question_id, answer_payload) do
    GenServer.call(via(pin), {:submit_answer, player_id, question_id, answer_payload})
  end

  def next_question(pin) do
    GenServer.call(via(pin), :next_question)
  end

  def remove_player(pin, player_id) do
    GenServer.cast(via(pin), {:remove_player, player_id})
  end

  def session_snapshot(pin) do
    GenServer.call(via(pin), :snapshot)
  end

  def nickname_available?(pin, nickname) do
    with {:ok, normalized_pin} <- normalize_pin(pin),
         {:ok, session} <- fetch_session_by_pin(normalized_pin),
         {:ok, _} <- ensure_running(session),
         {:ok, available?} <- GenServer.call(via(normalized_pin), {:nickname_available?, nickname}) do
      {:ok, available?}
    else
      {:error, reason} -> {:error, reason}
      _ -> {:error, :not_found}
    end
  end

  def via(pin), do: {:via, Registry, {Quiz.GameRegistry, pin}}

  defp normalize_pin(pin) when is_binary(pin) do
    trimmed = String.trim(pin)

    if trimmed == "" do
      :error
    else
      {:ok, trimmed}
    end
  end

  defp normalize_pin(pin) when is_integer(pin) do
    normalize_pin(Integer.to_string(pin))
  end

  defp normalize_pin(_), do: :error
end
