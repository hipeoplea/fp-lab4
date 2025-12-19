defmodule Quiz.Quiz do
  @moduledoc """
  Ecto schema for a quiz along with its questions.
  """

  use Ecto.Schema
  import Ecto.Changeset

  alias Quiz.Question

  @derive {Jason.Encoder,
           only: [
             :id,
             :title,
             :description,
             :is_public,
             :owner_id,
             :created_at,
             :updated_at,
             :questions
           ]}
  schema "quizzes" do
    field(:title, :string)
    field(:description, :string)
    field(:is_public, :boolean, default: false)

    belongs_to(:owner, Quiz.Accounts.User)
    has_many(:questions, Question, on_replace: :delete)

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(struct, attrs) do
    struct
    |> cast(attrs, [:title, :description, :is_public, :owner_id])
    |> validate_required([:title, :owner_id])
    |> cast_assoc(:questions, with: &Question.changeset/2)
  end
end
