defmodule QuizWeb.Plugs.Auth do
  @moduledoc false
  import Plug.Conn

  alias Quiz.Accounts.User
  alias Quiz.Repo
  alias QuizWeb.Auth.Token

  def init(opts), do: opts

  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, claims} <- Token.verify(token),
         user_id when is_integer(user_id) <- parse_id(claims["sub"]),
         %User{} = user <- Repo.get(User, user_id) do
      assign(conn, :current_user, user)
    else
      _ ->
        conn
        |> send_resp(:unauthorized, Jason.encode!(%{error: "unauthorized"}))
        |> halt()
    end
  end

  defp parse_id(val) when is_integer(val), do: val

  defp parse_id(val) when is_binary(val) do
    case Integer.parse(val) do
      {num, ""} -> num
      _ -> nil
    end
  end

  defp parse_id(_), do: nil
end
