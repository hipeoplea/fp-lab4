defmodule Quiz.Question do
  use Ecto.Schema
  import Ecto.Changeset

  alias Quiz.Choice

  @derive {Jason.Encoder, only: [:id, :type, :prompt, :time_limit_ms, :points, :position, :quiz_id, :created_at, :updated_at, :choices]}
  schema "questions" do
    field :type, :string
    field :prompt, :string
    field :time_limit_ms, :integer
    field :points, :integer
    field :position, :integer

    belongs_to :quiz, Quiz.Quiz
    has_many :choices, Choice, on_replace: :delete

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(struct, attrs) do
    struct
    |> cast(attrs, [:type, :prompt, :time_limit_ms, :points, :position, :quiz_id])
    |> validate_required([:type, :prompt, :time_limit_ms, :points, :position])
    |> validate_inclusion(:type, ["mcq", "tf"])
    |> cast_assoc(:choices, with: &Choice.changeset/2)
  end
end
