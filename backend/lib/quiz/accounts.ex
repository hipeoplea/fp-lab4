defmodule Quiz.Accounts do
  @moduledoc """
  Context boundary for registering accounts and authenticating users.
  """

  alias Quiz.Repo
  alias Quiz.Accounts.User

  def register_user(attrs) do
    %User{}
    |> User.registration_changeset(attrs)
    |> Repo.insert()
  end

  def authenticate(email, password) do
    email = String.downcase(email)

    case Repo.get_by(User, email: email) do
      nil ->
        Argon2.no_user_verify()
        {:error, :invalid_credentials}

      user ->
        if Argon2.verify_pass(password, user.hashed_password) do
          {:ok, user}
        else
          {:error, :invalid_credentials}
        end
    end
  end
end
