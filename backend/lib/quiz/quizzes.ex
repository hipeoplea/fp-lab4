defmodule Quiz.Quizzes do
  @moduledoc """
  Quiz CRUD with nested questions/choices.
  """

  import Ecto.Query
  alias Quiz.Repo
  alias Quiz.Quiz, as: QuizModel
  alias Quiz.Question
  alias Quiz.Choice

  def list_by_owner(owner_id) do
    QuizModel
    |> where([q], q.owner_id == ^owner_id)
    |> order_by([q], desc: q.updated_at)
    |> Repo.all()
  end

  def get_with_children!(id, owner_id) do
    QuizModel
    |> where([q], q.id == ^id and q.owner_id == ^owner_id)
    |> preload(questions: ^from(qq in Question, order_by: qq.position, preload: [choices: ^from(c in Choice, order_by: c.position)]))
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
    Repo.delete(quiz)
  end
end
