defmodule Quiz.Quizzes do
  @moduledoc """
  Quiz CRUD with nested questions/choices.
  """

  import Ecto.Query
  alias Quiz.Repo
  alias Quiz.Quiz, as: QuizModel
  alias Quiz.Question
  alias Quiz.Choice
  alias Quiz.GameSession
  alias Quiz.SessionAnswer
  alias Quiz.SessionPlayer

  def list_by_owner(owner_id) do
    QuizModel
    |> where([q], q.owner_id == ^owner_id)
    |> order_by([q], desc: q.updated_at)
    |> preload(^quiz_children_preload())
    |> Repo.all()
  end

  def get_with_children!(id, owner_id) do
    QuizModel
    |> where([q], q.id == ^id and q.owner_id == ^owner_id)
    |> preload(^quiz_children_preload())
    |> Repo.one!()
  end

  def get_full_quiz!(id) do
    QuizModel
    |> where([q], q.id == ^id)
    |> preload(^quiz_children_preload())
    |> Repo.one!()
  end

  def create(owner_id, attrs) do
    attrs = Map.put(attrs, "owner_id", owner_id)

    %QuizModel{}
    |> QuizModel.changeset(attrs)
    |> Repo.insert()
  end

  def update(%QuizModel{} = quiz, attrs) do
    quiz
    |> QuizModel.changeset(attrs)
    |> Repo.update()
  end

  def delete(%QuizModel{} = quiz) do
    Repo.transaction(fn ->
      cleanup_gameplay_data(quiz.id)
      Repo.delete(quiz)
    end)
    |> case do
      {:ok, {:ok, result}} -> {:ok, result}
      {:ok, {:error, changeset}} -> {:error, changeset}
      {:error, reason} -> {:error, reason}
    end
  end

  defp quiz_children_preload do
    [
      questions:
        from(qq in Question,
          order_by: qq.position,
          preload: [choices: ^from(c in Choice, order_by: c.position)]
        )
    ]
  end

  defp cleanup_gameplay_data(quiz_id) do
    question_ids =
      from(q in Question, where: q.quiz_id == ^quiz_id, select: q.id)
      |> Repo.all()

    if question_ids != [] do
      from(sa in SessionAnswer, where: sa.question_id in ^question_ids)
      |> Repo.delete_all()
    end

    session_ids =
      from(gs in GameSession, where: gs.quiz_id == ^quiz_id, select: gs.id)
      |> Repo.all()

    if session_ids != [] do
      from(sp in SessionPlayer, where: sp.session_id in ^session_ids)
      |> Repo.delete_all()

      from(gs in GameSession, where: gs.id in ^session_ids)
      |> Repo.delete_all()
    end
  end
end
