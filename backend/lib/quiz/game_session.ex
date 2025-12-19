defmodule Quiz.GameSession do
  @moduledoc """
  Ecto schema for persisted quiz game sessions.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @derive {
    Jason.Encoder,
    only: [
      :id,
      :quiz_id,
      :host_id,
      :pin,
      :status,
      :started_at,
      :ended_at,
      :settings,
      :report_ready,
      :state,
      :state_version,
      :last_persisted_at,
      :created_at,
      :updated_at
    ]
  }
  schema "game_sessions" do
    field :pin, :string
    field :status, :string, default: "lobby"
    field :started_at, :utc_datetime
    field :ended_at, :utc_datetime
    field :settings, :map, default: %{}
    field :report_ready, :boolean, default: false
    field :state, :map
    field :state_version, :integer, default: 0
    field :last_persisted_at, :utc_datetime

    belongs_to :quiz, Quiz.Quiz
    belongs_to :host, Quiz.Accounts.User

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(struct, attrs) do
    struct
    |> cast(attrs, [
      :pin,
      :status,
      :started_at,
      :ended_at,
      :quiz_id,
      :host_id,
      :settings,
      :report_ready,
      :state,
      :state_version,
      :last_persisted_at
    ])
    |> validate_required([:pin, :status, :quiz_id, :host_id])
    |> unique_constraint(:pin)
  end
end
