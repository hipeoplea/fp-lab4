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
    players = load_players(session.id)

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
      players: players,
      answers_current: reset_answers(players),
      timer_ref: nil,
      state_version: session.state_version || 0,
      current_question_payload: nil
    }

    state = apply_persisted_state(state, session)

    {:ok, state}
  end

  @impl true
  def handle_call({:join_player, nickname_raw, player_token}, _from, %{phase: :lobby} = state) do
    nickname = nickname_raw |> to_string() |> String.trim()

    case attempt_join_player(state, nickname, player_token) do
      {:reuse, player} -> {:reply, {:ok, player}, state}
      {:ok, player, new_state} -> {:reply, {:ok, player}, new_state}
      {:error, reason} -> {:reply, {:error, reason}, state}
    end
  end

  def handle_call({:join_player, _nickname, token}, _from, state) do
    with player_token when is_binary(player_token) <- token,
         {:ok, player} <- fetch_player_by_token(state.players, player_token) do
      {:reply, {:ok, player}, state}
    else
      _ -> {:reply, {:error, :not_in_lobby}, state}
    end
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

  def handle_call({:submit_answer, player_id, question_id, answer_payload}, _from, state) do
    now_ms = System.system_time(:millisecond)

    with :ok <- ensure_phase(state, :question),
         :ok <- ensure_current_question(state, question_id),
         :ok <- ensure_before_deadline(state, now_ms),
         {:ok, player} <- fetch_player(state, player_id),
         :ok <- ensure_not_answered(player) do
      latency = now_ms - state.question_started_at_ms
      question = get_question(state, question_id)
      answer = normalize_answer_payload(answer_payload)
      {is_correct, normalized_choice_id} = evaluate_answer(question, answer)

      ans = %{
        choice_id: normalized_choice_id,
        answer_text: answer.answer_text,
        ordering: answer.ordering,
        is_correct: is_correct,
        latency_ms: latency,
        answered_at: now_utc()
      }

      points_awarded = calculate_points(question, is_correct, latency)

      new_state =
        state
        |> put_in([:answers_current, player_id], ans)
        |> put_in([:players, player_id, :answered_current?], true)

      {:reply, {:ok, %{latency_ms: latency, points_awarded: points_awarded}}, new_state}
    else
      {:error, reason} -> {:reply, {:error, reason}, state}
    end
  end

  def handle_call({:nickname_available?, nickname_raw}, _from, state) do
    nickname = nickname_raw |> to_string() |> String.trim()
    available? = nickname != "" and not nickname_taken?(state.players, nickname)
    {:reply, {:ok, available?}, state}
  end

  def handle_call(:snapshot, _from, state) do
    {:reply, snapshot_payload(state), state}
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
  def handle_cast({:remove_player, player_id}, state) do
    case Map.pop(state.players, player_id) do
      {nil, _} ->
        {:noreply, state}

      {_player, players} ->
        Repo.delete_all(from(sp in SessionPlayer, where: sp.id == ^player_id))

        new_state =
          state
          |> Map.put(:players, players)
          |> Map.update!(:answers_current, &Map.delete(&1, player_id))
          |> persist_session_state()

        {:noreply, new_state}
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

    completed = state.question_index
    idx = completed + 1
    question_id = Enum.at(state.question_order, idx - 1)
    question = get_question(state, question_id)
    limit = question.time_limit_ms || 20_000
    ends_at = now_ms + limit
    timer_ref = Process.send_after(self(), :question_timeout, limit)

    display_choices = display_choices_for(question)

    payload = %{
      question_id: question_id,
      question_index: idx,
      total_questions: length(state.question_order),
      type: question.type,
      prompt: question.prompt,
      choices: display_choices,
      ends_at_ms: ends_at
    }

    payload_with_phase = Map.put(payload, :phase, :question)

    new_state = %{
      state
      | phase: :question,
        current_question_id: question_id,
        question_started_at_ms: now_ms,
        ends_at_ms: ends_at,
        timer_ref: timer_ref,
        answers_current: reset_answers(state.players),
        current_question_payload: payload_with_phase
    }

    {new_state, payload}
  end

  defp reset_answers(players) do
    Enum.reduce(players, %{}, fn {player_id, _player}, acc ->
      Map.put(acc, player_id, nil)
    end)
  end

  defp attempt_join_player(state, nickname, player_token) do
    with :ok <- ensure_present_nickname(nickname) do
      case maybe_reuse_player(state.players, player_token) do
        {:reuse, player} -> {:reuse, player}
        :not_found -> insert_player(state, nickname, player_token)
      end
    end
  end

  defp ensure_present_nickname(nickname) when is_binary(nickname) and nickname != "", do: :ok
  defp ensure_present_nickname(_), do: {:error, :nickname_required}

  defp maybe_reuse_player(_players, nil), do: :not_found

  defp maybe_reuse_player(players, token) do
    case fetch_player_by_token(players, token) do
      {:ok, player} -> {:reuse, player}
      _ -> :not_found
    end
  end

  defp insert_player(state, nickname, player_token) do
    case ensure_unique_nickname(state.players, nickname) do
      :ok -> persist_new_player(state, nickname, player_token)
      {:error, reason} -> {:error, reason}
    end
  end

  defp ensure_unique_nickname(players, nickname) do
    if nickname_taken?(players, nickname) do
      {:error, :nickname_taken}
    else
      :ok
    end
  end

  defp persist_new_player(state, nickname, player_token) do
    now = now_utc()
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

        updated_state = put_in(state, [:players, player.id], player_state)

        new_state =
          updated_state
          |> Map.put(:answers_current, reset_answers(updated_state.players))
          |> persist_session_state()

        {:ok, player_state, new_state}

      {:error, changeset} ->
        {:error, changeset}
    end
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
      Enum.reduce(results, {%{}, [], []}, fn {player_id, player, answer}, {players_acc, rows_acc, reveal_acc} ->
        {choice_id, latency_ms, answer_text, ordering, was_correct} =
          case answer do
            nil ->
              {nil, nil, nil, nil, false}

            %{
              choice_id: cid,
              latency_ms: lat,
              answer_text: text,
              ordering: ord,
              is_correct: correct?
            } ->
              {cid, lat, text, ord, correct?}
          end

        is_correct = was_correct

        points_awarded = calculate_points(question, is_correct, latency_ms)

        new_player =
          player
          |> Map.put(:score, player.score + points_awarded)
          |> Map.put(:answered_current?, false)

        answered_at =
          case answer do
            nil -> nil
            %{answered_at: ts} -> ts
          end

        now = now_utc()

        row = %{
          session_id: state.session_id,
          player_id: player_id,
          question_id: question.id,
          choice_id: choice_id,
          is_correct: is_correct,
          points_awarded: points_awarded,
          latency_ms: latency_ms,
          answered_at: answered_at,
          answer_text: answer_text,
          ordering: ordering,
          created_at: now,
          updated_at: now
        }

        reveal_item = %{
          player_id: player_id,
          nickname: player.nickname,
          choice_id: choice_id,
          is_correct: is_correct,
          points_awarded: points_awarded,
          latency_ms: latency_ms,
          answer_text: answer_text,
          ordering: ordering
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
        question_index: state.question_index + 1,
        current_question_id: nil,
        question_started_at_ms: nil,
        ends_at_ms: nil,
        answers_current: %{},
        players: updated_players,
        timer_ref: nil,
        current_question_payload: nil
    }
    |> persist_session_state()
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

  defp display_choices_for(question) do
    base = Enum.map(question.choices, &%{id: &1.id, text: &1.text, position: &1.position})

    case question.type do
      "ordering" -> Enum.shuffle(base)
      _ -> base
    end
  end

  defp broadcast_question_started(state, payload) do
    host_payload = state.current_question_payload || Map.put(payload, :phase, :question)
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
    now = now_utc()
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

    Endpoint.broadcast("game:#{state.pin}", "game_finished", %{
      phase: :finished,
      leaderboard: leaderboard,
      question_index: state.question_index,
      total_questions: length(state.question_order)
    })

    %{
      state
      | phase: :finished,
        session: %{state.session | ended_at: now, status: "finished"},
        timer_ref: nil
    }
    |> persist_session_state()
  end

  defp cancel_timer(nil), do: :ok
  defp cancel_timer(ref), do: Process.cancel_timer(ref, async: true, info: false)

  defp maybe_mark_started(%{session: session} = state) do
    now = now_utc()

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

  defp load_players(session_id) do
    SessionPlayer
    |> where([sp], sp.session_id == ^session_id)
    |> Repo.all()
    |> Enum.reduce(%{}, fn player, acc ->
      Map.put(acc, player.id, %{
        id: player.id,
        nickname: player.nickname,
        score: player.final_score || 0,
        answered_current?: false,
        player_token: player.player_token
      })
    end)
  end

  defp apply_persisted_state(state, session) do
    persisted = decode_persisted_state(session.state)

    players_with_scores =
      Enum.reduce(persisted.players, state.players, fn %{id: id, score: score}, acc ->
        case Map.fetch(acc, id) do
          {:ok, player} -> Map.put(acc, id, Map.put(player, :score, score))
          :error -> acc
        end
      end)

    %{
      state
      | phase: persisted.phase || state.phase,
        question_index: persisted.question_index || state.question_index,
        players: players_with_scores,
        answers_current: reset_answers(players_with_scores),
        state_version: session.state_version || state.state_version,
        session: %{
          state.session
          | state: session.state,
            state_version: session.state_version,
            last_persisted_at: session.last_persisted_at
        }
    }
  end

  defp decode_persisted_state(nil), do: %{phase: nil, question_index: 0, players: []}

  defp decode_persisted_state(map) when is_map(map) do
    %{
      phase: map |> value_from(:phase) |> phase_from_value(),
      question_index: value_from(map, :question_index) || 0,
      players: map |> value_from(:players) |> decode_players()
    }
  end

  defp decode_players(nil), do: []
  defp decode_players(list) when is_list(list), do: Enum.map(list, &decode_player_entry/1)
  defp decode_players(_), do: []

  defp decode_player_entry(entry) do
    %{
      id: value_from(entry, :id),
      nickname: value_from(entry, :nickname),
      score: value_from(entry, :score) || 0
    }
  end

  defp value_from(map, key) when is_map(map) do
    Map.get(map, to_string(key)) || Map.get(map, key)
  end

  defp value_from(_map, _key), do: nil

  defp persist_session_state(state) do
    encoded = encode_state(state)
    now = now_utc()
    new_version = state.state_version + 1

    Repo.update_all(
      from(gs in GameSession, where: gs.id == ^state.session_id),
      set: [state: encoded, state_version: new_version, last_persisted_at: now]
    )

    %{
      state
      | state_version: new_version,
        session: %{
          state.session
          | state: encoded,
            state_version: new_version,
            last_persisted_at: now
        }
    }
  end

  defp encode_state(state) do
    %{
      "phase" => Atom.to_string(state.phase),
      "question_index" => state.question_index,
      "players" =>
        Enum.map(state.players, fn {_id, player} ->
          %{"id" => player.id, "nickname" => player.nickname, "score" => player.score}
        end)
    }
  end

  defp fetch_player_by_token(players, token) do
    players
    |> Enum.find(fn {_id, player} -> player.player_token && player.player_token == token end)
    |> case do
      nil -> {:error, :unknown_player}
      {_id, player} -> {:ok, player}
    end
  end

  defp nickname_taken?(players, nickname) do
    normalized = String.downcase(String.trim(nickname))

    players
    |> Map.values()
    |> Enum.any?(fn player ->
      player.nickname && String.downcase(String.trim(player.nickname)) == normalized
    end)
  end

  defp snapshot_payload(state) do
    %{
      phase: Atom.to_string(state.phase),
      question_index: state.question_index,
      total_questions: length(state.question_order),
      leaderboard: leaderboard(state.players),
      current_question: snapshot_question(state)
    }
  end

  defp snapshot_question(%{phase: :question, current_question_payload: payload})
       when is_map(payload),
       do: payload

  defp snapshot_question(_), do: nil

  defp normalize_answer_payload(%{choice_id: cid, answer_text: text, ordering: ordering}) do
    %{
      choice_id: normalize_choice_id(cid),
      answer_text: normalize_answer_text(text),
      ordering: normalize_ordering(ordering)
    }
  end

  defp normalize_answer_payload(%{"choice_id" => cid} = payload) do
    normalize_answer_payload(%{
      choice_id: cid,
      answer_text: Map.get(payload, "answer_text"),
      ordering: Map.get(payload, "ordering")
    })
  end

  defp normalize_answer_payload(choice_id) do
    %{
      choice_id: normalize_choice_id(choice_id),
      answer_text: nil,
      ordering: []
    }
  end

  defp normalize_choice_id(nil), do: nil
  defp normalize_choice_id(id) when is_integer(id), do: id

  defp normalize_choice_id(id) when is_binary(id) do
    case Integer.parse(id) do
      {num, ""} -> num
      _ -> nil
    end
  end

  defp normalize_choice_id(_), do: nil

  defp normalize_answer_text(nil), do: nil

  defp normalize_answer_text(text) when is_binary(text) do
    cleaned = text |> String.trim()
    if cleaned == "", do: nil, else: cleaned
  end

  defp normalize_answer_text(_), do: nil

  defp normalize_ordering(nil), do: []

  defp normalize_ordering(list) when is_list(list) do
    list
    |> Enum.map(&normalize_choice_id/1)
    |> Enum.filter(& &1)
  end

  defp normalize_ordering(_), do: []

  defp evaluate_answer(question, %{choice_id: cid} = payload) do
    case question.type do
      "mcq" -> {correct_choice?(question, cid), cid}
      "tf" -> {correct_choice?(question, cid), cid}
      "ordering" -> evaluate_ordering(question, payload.ordering)
      "input" -> evaluate_input(question, payload)
      _ -> {correct_choice?(question, cid), cid}
    end
  end

  defp correct_choice?(question, choice_id) do
    !!choice_id and
      Enum.any?(question.choices, fn choice -> choice.id == choice_id && choice.is_correct end)
  end

  defp evaluate_ordering(question, submitted) do
    expected = question.choices |> Enum.sort_by(& &1.position) |> Enum.map(& &1.id)
    {submitted == expected && expected != [], nil}
  end

  defp evaluate_input(question, %{answer_text: answer_text, choice_id: choice_id}) do
    cond do
      answer_text && normalize_free_input(answer_text) != nil ->
        norm = normalize_free_input(answer_text)

        accepted =
          question.choices
          |> Enum.map(fn choice -> normalize_free_input(choice.text) end)
          |> Enum.reject(&is_nil/1)

        result = norm && norm in accepted
        {!!result, nil}

      choice_id ->
        {correct_choice?(question, choice_id), choice_id}

      true ->
        {false, nil}
    end
  end

  defp normalize_free_input(nil), do: nil

  defp normalize_free_input(text) do
    cleaned = text |> String.trim() |> String.downcase()
    if cleaned == "", do: nil, else: cleaned
  end

  defp phase_from_value(nil), do: nil
  defp phase_from_value(phase) when is_atom(phase), do: phase

  defp phase_from_value(phase) when is_binary(phase) do
    case phase do
      "lobby" -> :lobby
      "question" -> :question
      "leaderboard" -> :leaderboard
      "finished" -> :finished
      _ -> nil
    end
  end

  defp now_utc do
    DateTime.utc_now() |> DateTime.truncate(:second)
  end

  defp calculate_points(_question, false, _latency_ms), do: 0

  defp calculate_points(question, true, latency_ms) do
    base_points = question.points || 0
    limit = question.time_limit_ms || 20_000

    cond do
      base_points <= 0 ->
        0

      is_nil(latency_ms) ->
        base_points

      true ->
        time_left = max(limit - latency_ms, 0)
        speed_factor = time_left / limit
        guaranteed = round(base_points * 0.5)
        bonus = round(base_points * 0.5 * speed_factor)
        guaranteed + bonus
    end
  end
end
