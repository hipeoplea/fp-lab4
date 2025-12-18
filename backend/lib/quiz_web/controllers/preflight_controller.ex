defmodule QuizWeb.PreflightController do
  use QuizWeb, :controller

  def options(conn, _params) do
    conn
    |> put_status(:no_content)
    |> text("")
  end
end
