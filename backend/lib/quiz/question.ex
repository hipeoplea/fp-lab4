defmodule Quiz.Question do
  use Ecto.Schema
  import Ecto.Changeset

  alias Quiz.Choice

  @derive {Jason.Encoder,
           only: [
             :id,
             :type,
             :prompt,
             :time_limit_ms,
             :points,
             :position,
             :quiz_id,
             :created_at,
             :updated_at,
             :choices
           ]}
  schema "questions" do
    field(:type, :string)
    field(:prompt, :string)
    field(:time_limit_ms, :integer)
    field(:points, :integer)
    field(:position, :integer)

    belongs_to(:quiz, Quiz.Quiz)
    has_many(:choices, Choice, on_replace: :delete)

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(struct, attrs) do
    struct
    |> cast(attrs, [:type, :prompt, :time_limit_ms, :points, :position, :quiz_id])
    |> validate_required([:type, :prompt, :time_limit_ms, :points, :position])
    |> validate_inclusion(:type, ["mcq", "tf", "ordering", "input"])
    |> cast_assoc(:choices, with: &Choice.changeset/2)
    |> validate_choice_constraints()
  end

  defp validate_choice_constraints(changeset) do
    type = get_field(changeset, :type)
    choices = get_field(changeset, :choices) || []
    entries = Enum.map(choices, &choice_struct/1)

    case type do
      "mcq" -> validate_mcq(changeset, entries)
      "tf" -> validate_tf(changeset, entries)
      "ordering" -> validate_ordering(changeset, entries)
      "input" -> validate_input(changeset, entries)
      _ -> changeset
    end
  end

  defp validate_mcq(changeset, entries) do
    cond do
      length(entries) != 4 -> add_error(changeset, :choices, "Multiple choice questions require 4 answers")
      Enum.count(entries, & &1.is_correct) != 1 ->
        add_error(changeset, :choices, "Multiple choice must have exactly one correct answer")
      true -> changeset
    end
  end

  defp validate_tf(changeset, entries) do
    cond do
      length(entries) != 2 -> add_error(changeset, :choices, "True/False questions require exactly 2 answers")
      Enum.count(entries, & &1.is_correct) != 1 ->
        add_error(changeset, :choices, "True/False must have exactly one correct answer")
      true -> changeset
    end
  end

  defp validate_ordering(changeset, entries) do
    count = length(entries)

    cond do
      count < 3 or count > 10 ->
        add_error(changeset, :choices, "Ordering questions require between 3 and 10 items")
      true -> changeset
    end
  end

  defp validate_input(changeset, entries) do
    if Enum.empty?(entries) do
      add_error(changeset, :choices, "Input questions require at least one acceptable answer")
    else
      changeset
    end
  end

  defp choice_struct(%Ecto.Changeset{} = changeset), do: Ecto.Changeset.apply_changes(changeset)
  defp choice_struct(%Choice{} = choice), do: choice
end
