defmodule QuizWeb.AuthController do
  use QuizWeb, :controller

  alias Quiz.Accounts
  alias QuizWeb.Auth.Token
  def register(conn, %{"email" => _} = params) do
    with {:ok, user} <- Accounts.register_user(params),
         {:ok, jwt} <- Token.generate(user) do
      json(conn, %{token: jwt, user: %{id: user.id, email: user.email, name: user.name}})
    else
      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "validation_error", details: errors(changeset)})

      _ ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "internal_error"})
    end
  end

  def login(conn, %{"email" => email, "password" => password}) do
    with {:ok, user} <- Accounts.authenticate(email, password),
         {:ok, jwt} <- Token.generate(user) do
      json(conn, %{token: jwt, user: %{id: user.id, email: user.email, name: user.name}})
    else
      _ ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "invalid_credentials"})
    end
  end

  defp errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {k, v}, acc ->
        String.replace(acc, "%{#{k}}", to_string(v))
      end)
    end)
  end
end
