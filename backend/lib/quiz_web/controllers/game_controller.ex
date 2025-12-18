defmodule QuizWeb.GameController do
  use QuizWeb, :controller

  alias Quiz.Games

  action_fallback QuizWeb.FallbackController

  def create(%{assigns: %{current_user: user}} = conn, params) do
    quiz_id = Map.get(params, "quiz_id") || Map.get(params, "quizId")

    case Games.create_session(user.id, quiz_id, params) do
      {:ok, session} ->
        json(conn, session)

      {:error, :pin_generation_failed} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{error: "pin_generation_failed"})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "validation_error", details: changeset_errors(changeset)})
    end
  end

  defp changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {k, v}, acc -> String.replace(acc, "%{#{k}}", to_string(v)) end)
    end)
  end
end
