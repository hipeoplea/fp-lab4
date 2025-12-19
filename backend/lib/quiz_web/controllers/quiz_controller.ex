defmodule QuizWeb.QuizController do
  use QuizWeb, :controller

  alias Quiz.Quizzes

  action_fallback(QuizWeb.FallbackController)

  def index(%{assigns: %{current_user: user}} = conn, _params) do
    quizzes = Quizzes.list_by_owner(user.id)
    json(conn, quizzes)
  end

  def show(%{assigns: %{current_user: user}} = conn, %{"id" => id}) do
    quiz = Quizzes.get_with_children!(id, user.id)
    json(conn, quiz)
  end

  def create(%{assigns: %{current_user: user}} = conn, params) do
    attrs = normalize_quiz(params)

    try do
      case Quizzes.create(user.id, attrs) do
        {:ok, quiz} -> json(conn, quiz)
        {:error, changeset} -> validation_error(conn, changeset)
      end
    rescue
      e in Ecto.ConstraintError -> constraint_error(conn, e)
    end
  end

  def update(%{assigns: %{current_user: user}} = conn, %{"id" => id} = params) do
    quiz = Quizzes.get_with_children!(id, user.id)

    attrs = normalize_quiz(Map.delete(params, "id"))

    try do
      case Quizzes.update(quiz, attrs) do
        {:ok, quiz} -> json(conn, quiz)
        {:error, changeset} -> validation_error(conn, changeset)
      end
    rescue
      e in Ecto.ConstraintError -> constraint_error(conn, e)
    end
  end

  def delete(%{assigns: %{current_user: user}} = conn, %{"id" => id}) do
    quiz = Quizzes.get_with_children!(id, user.id)

    try do
      {:ok, _} = Quizzes.delete(quiz)
      send_resp(conn, :no_content, "")
    rescue
      e in Ecto.ConstraintError -> constraint_error(conn, e)
    end
  end

  defp validation_error(conn, changeset) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: "validation_error", details: errors(changeset)})
  end

  defp errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {k, v}, acc -> String.replace(acc, "%{#{k}}", to_string(v)) end)
    end)
  end

  defp normalize_quiz(params) do
    %{
      "title" => params["title"],
      "description" => Map.get(params, "description"),
      "is_public" => Map.get(params, "is_public") || Map.get(params, "public") || false,
      "questions" => normalize_questions(Map.get(params, "questions", []))
    }
  end

  defp normalize_questions(list) when is_list(list) do
    list
    |> Enum.with_index(1)
    |> Enum.map(fn {item, idx} ->
      %{
        "type" => normalize_question_type(Map.get(item, "type", "mcq")),
        "prompt" => Map.get(item, "text") || Map.get(item, "prompt"),
        "time_limit_ms" => (Map.get(item, "timer") || 20) * 1000,
        "points" => Map.get(item, "points") || 1000,
        "position" => Map.get(item, "position") || idx,
        "choices" => normalize_choices(Map.get(item, "answers") || Map.get(item, "choices") || [])
      }
    end)
  end

  defp normalize_choices(list) when is_list(list) do
    list
    |> Enum.with_index(1)
    |> Enum.map(fn {choice, idx} ->
      %{
        "text" => Map.get(choice, "text"),
        "is_correct" => Map.get(choice, "correct") || Map.get(choice, "is_correct") || false,
        "position" => Map.get(choice, "position") || idx
      }
    end)
  end

  defp normalize_question_type(type) do
    case type do
      "multiple_choice" -> "mcq"
      "true_false" -> "tf"
      "ordering" -> "ordering"
      "input" -> "input"
      "mcq" -> "mcq"
      "tf" -> "tf"
      _ -> "mcq"
    end
  end

  defp constraint_error(conn, error) do
    {code, message} = constraint_message(error)

    conn
    |> put_status(:unprocessable_entity)
    |> json(%{
      error: code,
      constraint: error.constraint,
      message: message
    })
  end

  defp constraint_message(%Ecto.ConstraintError{constraint: "session_answers_question_id_fkey"}) do
    {"question_has_answers", "Нельзя удалить вопрос, по которому уже есть результаты игры."}
  end

  defp constraint_message(%Ecto.ConstraintError{constraint: "choices_question_id_fkey"}) do
    {"choice_has_answers",
     "Нельзя удалить вариант ответа, если по нему сохранены ответы игроков."}
  end

  defp constraint_message(_error) do
    {"constraint_error", "Запрос нарушает ограничение базы данных."}
  end
end
