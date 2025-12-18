defmodule Quiz.Repo.Migrations.AddGameplaySupport do
  use Ecto.Migration

  def change do
    alter table(:game_sessions) do
      add :settings, :map, default: %{}, null: false
      add :report_ready, :boolean, default: false, null: false

      add :state, :map
      add :state_version, :integer, default: 0, null: false
      add :last_persisted_at, :utc_datetime
    end

    create table(:session_players) do
      add :session_id, references(:game_sessions, on_delete: :delete_all), null: false
      add :nickname, :text, null: false
      add :player_token, :uuid
      add :joined_at, :utc_datetime
      add :final_score, :integer, default: 0, null: false

      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create index(:session_players, [:session_id])
    create unique_index(:session_players, [:session_id, :player_token],
             name: :uq_session_players_token,
             where: "player_token IS NOT NULL"
           )

    create table(:session_answers) do
      add :session_id, references(:game_sessions, on_delete: :delete_all), null: false
      add :player_id, references(:session_players, on_delete: :delete_all), null: false
      add :question_id, references(:questions, on_delete: :restrict), null: false
      add :choice_id, references(:choices, on_delete: :restrict)

      add :is_correct, :boolean, default: false, null: false
      add :points_awarded, :integer, default: 0, null: false
      add :latency_ms, :integer
      add :answered_at, :utc_datetime

      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create index(:session_answers, [:session_id])
    create index(:session_answers, [:player_id])
    create index(:session_answers, [:question_id])
    create index(:session_answers, [:session_id, :player_id, :question_id],
             name: :idx_session_answers_unique_by_question
           )
  end
end
