defmodule Quiz.SessionAnswer do
  use Ecto.Schema
  import Ecto.Changeset

  schema "session_answers" do
    field(:is_correct, :boolean, default: false)
    field(:points_awarded, :integer, default: 0)
    field(:latency_ms, :integer)
    field(:answered_at, :utc_datetime)
    field(:answer_text, :string)
    field(:ordering, {:array, :integer})

    belongs_to(:session, Quiz.GameSession)
    belongs_to(:player, Quiz.SessionPlayer)
    belongs_to(:question, Quiz.Question)
    belongs_to(:choice, Quiz.Choice)

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(struct, attrs) do
    struct
    |> cast(attrs, [
      :is_correct,
      :points_awarded,
      :latency_ms,
      :answered_at,
      :answer_text,
      :ordering,
      :session_id,
      :player_id,
      :question_id,
      :choice_id
    ])
    |> validate_required([:session_id, :player_id, :question_id])
  end
end
