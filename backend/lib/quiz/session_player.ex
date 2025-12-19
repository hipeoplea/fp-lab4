defmodule Quiz.SessionPlayer do
  @moduledoc """
  Ecto schema representing a player that joined a session.
  """

  use Ecto.Schema
  import Ecto.Changeset

  schema "session_players" do
    field(:nickname, :string)
    field(:player_token, Ecto.UUID)
    field(:joined_at, :utc_datetime)
    field(:final_score, :integer, default: 0)

    belongs_to(:session, Quiz.GameSession)

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(struct, attrs) do
    struct
    |> cast(attrs, [:nickname, :player_token, :joined_at, :final_score, :session_id])
    |> validate_required([:nickname, :session_id])
    |> unique_constraint(:player_token,
      name: :uq_session_players_token,
      message: "player already connected"
    )
  end
end
