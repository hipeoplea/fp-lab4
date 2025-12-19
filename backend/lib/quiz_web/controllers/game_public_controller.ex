defmodule QuizWeb.GamePublicController do
  use QuizWeb, :controller

  alias Quiz.Games

  def check(conn, params) do
    with {:ok, pin, nickname} <- normalize_params(params),
         {:ok, available?} <- Games.nickname_available?(pin, nickname) do
      json(conn, %{available: available?})
    else
      {:error, :invalid_params} ->
        conn |> put_status(:bad_request) |> json(%{error: "invalid_params"})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "session_not_found"})

      _ ->
        conn |> put_status(:internal_server_error) |> json(%{error: "internal_error"})
    end
  end

  defp normalize_params(params) do
    pin = (params["pin"] || params["code"] || "") |> to_string() |> String.trim()
    nickname = (params["nickname"] || "") |> to_string() |> String.trim()

    if pin == "" or nickname == "" do
      {:error, :invalid_params}
    else
      {:ok, pin, nickname}
    end
  end
end
