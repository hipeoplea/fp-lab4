defmodule Quiz.Repo.Migrations.UpdateSessionAnswersQuestionFk do
  use Ecto.Migration

  def up do
    execute("ALTER TABLE session_answers DROP CONSTRAINT IF EXISTS session_answers_question_id_fkey")

    alter table(:session_answers) do
      modify(:question_id, references(:questions, on_delete: :delete_all), null: false)
    end
  end

  def down do
    execute("ALTER TABLE session_answers DROP CONSTRAINT IF EXISTS session_answers_question_id_fkey")

    alter table(:session_answers) do
      modify(:question_id, references(:questions, on_delete: :restrict), null: false)
    end
  end
end
