defmodule QuizWeb.UserSocket do
  use Phoenix.Socket

  alias Quiz.Repo
  channel "game:*", QuizWeb.GameChannel

  @impl true
  def connect(%{"token" => token} = params, socket, _connect_info) when is_binary(token) do
    socket =
      case QuizWeb.Auth.Token.verify(token) do
        {:ok, claims} ->
          case Repo.get(Quiz.Accounts.User, parse_id(claims["sub"])) do
            nil -> socket
            user -> Phoenix.Socket.assign(socket, :current_user, user)
          end

        _ ->
          socket
      end

    {:ok, assign(socket, :connect_params, Map.delete(params, "token"))}
  end

  def connect(params, socket, _connect_info) do
    {:ok, assign(socket, :connect_params, params)}
  end

  @impl true
  def id(_socket), do: nil

  defp parse_id(val) when is_integer(val), do: val

  defp parse_id(val) when is_binary(val) do
    case Integer.parse(val) do
      {num, ""} -> num
      _ -> nil
    end
  end

  defp parse_id(_), do: nil
end
