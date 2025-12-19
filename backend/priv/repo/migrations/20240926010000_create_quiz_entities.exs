defmodule Quiz.Repo.Migrations.CreateQuizEntities do
  use Ecto.Migration

  def change do
    create table(:quizzes) do
      add(:owner_id, references(:users, on_delete: :delete_all), null: false)
      add(:title, :text, null: false)
      add(:description, :text)
      add(:is_public, :boolean, default: false, null: false)

      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(index(:quizzes, [:owner_id]))

    create table(:questions) do
      add(:quiz_id, references(:quizzes, on_delete: :delete_all), null: false)
      add(:type, :text, null: false)
      add(:prompt, :text, null: false)
      add(:time_limit_ms, :integer, null: false, default: 20_000)
      add(:points, :integer, null: false, default: 1_000)
      add(:position, :integer, null: false)

      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(index(:questions, [:quiz_id]))
    create(unique_index(:questions, [:quiz_id, :position], name: :uq_questions_quiz_position))

    create table(:choices) do
      add(:question_id, references(:questions, on_delete: :delete_all), null: false)
      add(:text, :text, null: false)
      add(:is_correct, :boolean, default: false, null: false)
      add(:position, :integer, null: false)

      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(index(:choices, [:question_id]))
    create(unique_index(:choices, [:question_id, :position], name: :uq_choices_question_position))

    create table(:game_sessions) do
      add(:quiz_id, references(:quizzes, on_delete: :restrict), null: false)
      add(:host_id, references(:users, on_delete: :restrict), null: false)
      add(:pin, :text, null: false)
      add(:status, :text, null: false, default: "lobby")
      add(:started_at, :utc_datetime)
      add(:ended_at, :utc_datetime)

      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:game_sessions, [:pin]))
    create(index(:game_sessions, [:quiz_id]))
    create(index(:game_sessions, [:host_id]))
  end
end
