defmodule QuizWeb.FallbackController do
  use QuizWeb, :controller

  def call(conn, {:error, :not_found}) do
    conn |> put_status(:not_found) |> json(%{error: "not_found"})
  end

  def call(conn, {:error, :unauthorized}) do
    conn |> put_status(:unauthorized) |> json(%{error: "unauthorized"})
  end

  def call(conn, {:error, changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: "validation_error", details: format_errors(changeset)})
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {k, v}, acc -> String.replace(acc, "%{#{k}}", to_string(v)) end)
    end)
  end
end
