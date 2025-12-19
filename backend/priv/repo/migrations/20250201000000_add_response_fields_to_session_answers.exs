defmodule Quiz.Repo.Migrations.AddResponseFieldsToSessionAnswers do
  use Ecto.Migration

  def change do
    alter table(:session_answers) do
      add :answer_text, :text
      add :ordering, {:array, :integer}
    end
  end
end
