defmodule QuizWeb.PreflightController do
  @moduledoc """
  Minimal controller that responds to CORS preflight checks.
  """

  use QuizWeb, :controller

  def options(conn, _params) do
    conn
    |> put_status(:no_content)
    |> text("")
  end
end
