defmodule Quiz.GameServer do
  @moduledoc """
  GenServer на один PIN. Держит состояние игры, переходы фаз, таймеры и запись ответов.
  """

  use GenServer
  import Ecto.Query
  alias Ecto.UUID

  require Logger

  alias Quiz.{Quizzes, Repo}
  alias Quiz.{SessionPlayer, SessionAnswer, GameSession}
  alias QuizWeb.Endpoint

  ## Public API

  def ensure_started(%{pin: pin} = session) do
    case Registry.lookup(Quiz.GameRegistry, pin) do
      [{pid, _}] -> {:ok, pid}
      [] -> DynamicSupervisor.start_child(Quiz.GameSupervisor, {__MODULE__, session: session})
    end
  end

  ## GenServer callbacks

  def start_link(opts) do
    session = Keyword.fetch!(opts, :session)
    GenServer.start_link(__MODULE__, session, name: via(session.pin))
  end

  @impl true
  def init(session) do
    quiz = Quizzes.get_full_quiz!(session.quiz_id)

    state = %{
      session: session,
      session_id: session.id,
      pin: session.pin,
      quiz_id: session.quiz_id,
      quiz: quiz,
      phase: :lobby,
      question_index: 0,
      question_order: Enum.map(quiz.questions, & &1.id),
      current_question_id: nil,
      question_started_at_ms: nil,
      ends_at_ms: nil,
      players: %{},
      answers_current: %{},
      timer_ref: nil,
      state_version: 0
    }

    {:ok, state}
  end

  @impl true
  def handle_call({:join_player, nickname, player_token}, _from, %{phase: :lobby} = state) do
    now = DateTime.utc_now()
    token = player_token || UUID.generate()

    changeset =
      SessionPlayer.changeset(%SessionPlayer{}, %{
        nickname: nickname,
        player_token: token,
        joined_at: now,
        session_id: state.session_id
      })

    case Repo.insert(changeset) do
      {:ok, player} ->
        player_state = %{
          id: player.id,
          nickname: player.nickname,
          score: player.final_score || 0,
          answered_current?: false,
          player_token: player.player_token
        }

        new_state = put_in(state.players[player.id], player_state)
        {:reply, {:ok, player_state}, new_state}

      {:error, changeset} ->
        {:reply, {:error, changeset}, state}
    end
  end

  def handle_call({:join_player, _nickname, _token}, _from, state) do
    {:reply, {:error, :not_in_lobby}, state}
  end

  def handle_call(:host_start, _from, %{phase: :lobby} = state) do
    now_ms = System.system_time(:millisecond)
    state = maybe_mark_started(state)
    {new_state, payload} = start_question(state, now_ms)
    broadcast_question_started(new_state, payload)
    {:reply, {:ok, payload}, new_state}
  end

  def handle_call(:host_start, _from, state) do
    {:reply, {:error, :already_started}, state}
  end

  def handle_call({:submit_answer, player_id, question_id, choice_id}, _from, state) do
    now_ms = System.system_time(:millisecond)

    with :ok <- ensure_phase(state, :question),
         :ok <- ensure_current_question(state, question_id),
         :ok <- ensure_before_deadline(state, now_ms),
         {:ok, player} <- fetch_player(state, player_id),
         :ok <- ensure_not_answered(player) do
      latency = now_ms - state.question_started_at_ms

      ans = %{
        choice_id: choice_id,
        latency_ms: latency,
        answered_at: DateTime.utc_now()
      }

      new_state =
        state
        |> put_in([:answers_current, player_id], ans)
        |> put_in([:players, player_id, :answered_current?], true)

      {:reply, {:ok, %{latency_ms: latency}}, new_state}
    else
      {:error, reason} -> {:reply, {:error, reason}, state}
    end
  end

  def handle_call(:next_question, _from, state) do
    {state, result} = maybe_finish_question(state)

    cond do
      result == :finished ->
        {:reply, {:ok, %{status: :finished}}, state}

      next_question_available?(state) ->
        now_ms = System.system_time(:millisecond)
        {state, payload} = start_question(state, now_ms)
        broadcast_question_started(state, payload)
        {:reply, {:ok, payload}, state}

      true ->
        {:reply, {:error, :no_more_questions}, state}
    end
  end

  @impl true
  def handle_info(:question_timeout, state) do
    {state, _result} = maybe_finish_question(state)
    {:noreply, state}
  end

  defp via(pin), do: {:via, Registry, {Quiz.GameRegistry, pin}}

  defp ensure_phase(%{phase: phase}, phase), do: :ok
  defp ensure_phase(%{phase: _}, _), do: {:error, :not_in_phase}

  defp ensure_current_question(%{current_question_id: id}, id), do: :ok
  defp ensure_current_question(_, _), do: {:error, :wrong_question}

  defp ensure_before_deadline(%{ends_at_ms: ends_at}, now_ms) when now_ms < ends_at, do: :ok
  defp ensure_before_deadline(_, _), do: {:error, :too_late}

  defp fetch_player(%{players: players}, player_id) do
    case Map.fetch(players, player_id) do
      {:ok, player} -> {:ok, player}
      :error -> {:error, :unknown_player}
    end
  end

  defp ensure_not_answered(%{answered_current?: false}), do: :ok
  defp ensure_not_answered(_), do: {:error, :already_answered}

  defp start_question(state, now_ms) do
    cancel_timer(state.timer_ref)

    idx = state.question_index + 1
    question_id = Enum.at(state.question_order, idx - 1)
    question = get_question(state, question_id)
    limit = question.time_limit_ms || 20_000
    ends_at = now_ms + limit
    timer_ref = Process.send_after(self(), :question_timeout, limit)

    payload = %{
      question_id: question_id,
      question_index: idx,
      total_questions: length(state.question_order),
      prompt: question.prompt,
      choices: Enum.map(question.choices, &%{id: &1.id, text: &1.text, position: &1.position}),
      ends_at_ms: ends_at
    }

    new_state = %{
      state
      | phase: :question,
        question_index: idx,
        current_question_id: question_id,
        question_started_at_ms: now_ms,
        ends_at_ms: ends_at,
        timer_ref: timer_ref,
        answers_current: reset_answers(state.players)
    }

    {new_state, payload}
  end

  defp reset_answers(players) do
    Enum.reduce(players, %{}, fn {player_id, _player}, acc ->
      Map.put(acc, player_id, nil)
    end)
  end

  defp maybe_finish_question(%{phase: :question} = state) do
    cancel_timer(state.timer_ref)
    new_state = finalize_question(state)

    if new_state.question_index == length(new_state.question_order) do
      final_state = finish_game(new_state)
      {final_state, :finished}
    else
      {new_state, :finished}
    end
  end

  defp maybe_finish_question(state), do: {state, :noop}

  defp finalize_question(state) do
    question = get_question(state, state.current_question_id)
    correct_ids = MapSet.new(Enum.filter(question.choices, & &1.is_correct) |> Enum.map(& &1.id))
    answers_current = state.answers_current

    results =
      Enum.map(state.players, fn {player_id, player} ->
        answer = answers_current[player_id]
        {player_id, player, answer}
      end)

    {updated_players, rows, reveal} =
      Enum.reduce(results, {%{}, [], []}, fn {player_id, player, answer},
                                             {players_acc, rows_acc, reveal_acc} ->
        {choice_id, latency_ms} =
          case answer do
            nil -> {nil, nil}
            %{choice_id: cid, latency_ms: lat} -> {cid, lat}
          end

        is_correct = !!(choice_id && MapSet.member?(correct_ids, choice_id))

        points_awarded =
          if is_correct and latency_ms do
            speed_factor = max(question.time_limit_ms - latency_ms, 0) / question.time_limit_ms
            round(question.points * speed_factor)
          else
            0
          end

        new_player =
          player
          |> Map.put(:score, player.score + points_awarded)
          |> Map.put(:answered_current?, false)

        answered_at =
          case answer do
            nil -> nil
            %{answered_at: ts} -> ts
          end

        row = %{
          session_id: state.session_id,
          player_id: player_id,
          question_id: question.id,
          choice_id: choice_id,
          is_correct: is_correct,
          points_awarded: points_awarded,
          latency_ms: latency_ms,
          answered_at: answered_at,
          inserted_at: DateTime.utc_now(),
          updated_at: DateTime.utc_now()
        }

        reveal_item = %{
          player_id: player_id,
          nickname: player.nickname,
          choice_id: choice_id,
          is_correct: is_correct,
          points_awarded: points_awarded,
          latency_ms: latency_ms
        }

        {
          Map.put(players_acc, player_id, new_player),
          [row | rows_acc],
          [reveal_item | reveal_acc]
        }
      end)

    persist_answers(rows)

    leaderboard = leaderboard(updated_players)

    broadcast_reveal(state.pin, %{
      question_id: question.id,
      correct_choice_ids: MapSet.to_list(correct_ids),
      answers: reveal,
      leaderboard: leaderboard
    })

    %{
      state
      | phase: :leaderboard,
        current_question_id: nil,
        question_started_at_ms: nil,
        ends_at_ms: nil,
        answers_current: %{},
        players: updated_players,
        timer_ref: nil
    }
  end

  defp persist_answers([]), do: :ok

  defp persist_answers(rows) do
    Repo.insert_all(SessionAnswer, rows)
  end

  defp next_question_available?(state) do
    state.question_index < length(state.question_order)
  end

  defp get_question(state, id) do
    Enum.find(state.quiz.questions, fn q -> q.id == id end)
  end

  defp broadcast_question_started(state, payload) do
    host_payload = payload |> Map.put(:phase, :question)
    Endpoint.broadcast("game:#{state.pin}", "question_started", host_payload)
  end

  defp broadcast_reveal(pin, payload) do
    Endpoint.broadcast("game:#{pin}", "question_reveal", payload)
  end

  defp leaderboard(players) do
    players
    |> Map.values()
    |> Enum.sort_by(fn p -> -p.score end)
    |> Enum.map(fn p -> %{player_id: p.id, nickname: p.nickname, score: p.score} end)
  end

  defp finish_game(state) do
    now = DateTime.utc_now()
    leaderboard = leaderboard(state.players)

    Repo.update_all(
      from(gs in GameSession, where: gs.id == ^state.session_id),
      set: [ended_at: now, report_ready: true, status: "finished"]
    )

    Enum.each(leaderboard, fn %{player_id: player_id, score: score} ->
      Repo.update_all(
        from(sp in SessionPlayer, where: sp.id == ^player_id),
        set: [final_score: score]
      )
    end)

    Endpoint.broadcast("game:#{state.pin}", "game_finished", %{leaderboard: leaderboard})

    %{
      state
      | phase: :finished,
        session: %{state.session | ended_at: now, status: "finished"},
        timer_ref: nil
    }
  end

  defp cancel_timer(nil), do: :ok
  defp cancel_timer(ref), do: Process.cancel_timer(ref, async: true, info: false)

  defp maybe_mark_started(%{session: session} = state) do
    now = DateTime.utc_now()

    case session.started_at do
      nil ->
        Repo.update_all(
          from(gs in GameSession, where: gs.id == ^session.id),
          set: [started_at: now, status: "in_progress"]
        )

        %{state | session: %{session | started_at: now, status: "in_progress"}}

      _ ->
        state
    end
  end
end
