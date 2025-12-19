defmodule Quiz.Choice do
  @moduledoc """
  Ecto schema describing a selectable answer choice.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, only: [:id, :text, :is_correct, :position, :question_id, :created_at, :updated_at]}
  schema "choices" do
    field :text, :string
    field :is_correct, :boolean, default: false
    field :position, :integer

    belongs_to :question, Quiz.Question

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(struct, attrs) do
    struct
    |> cast(attrs, [:text, :is_correct, :position, :question_id])
    |> validate_required([:text, :position])
  end
end
