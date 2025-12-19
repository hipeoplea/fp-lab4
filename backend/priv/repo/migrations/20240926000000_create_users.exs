defmodule Quiz.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users) do
      add(:email, :string, null: false)
      add(:hashed_password, :string, null: false)
      add(:name, :string)

      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:users, [:email]))
  end
end
