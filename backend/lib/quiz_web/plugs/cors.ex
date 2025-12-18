defmodule QuizWeb.Plugs.CORS do
  @moduledoc false

  import Plug.Conn

  @allow_headers ~w(content-type authorization)

  def init(opts), do: opts

  def call(conn, _opts) do
    conn
    |> put_resp_header("access-control-allow-origin", "*")
    |> put_resp_header("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
    |> put_resp_header("access-control-allow-headers", Enum.join(@allow_headers, ", "))
    |> put_resp_header("access-control-max-age", "86400")
    |> maybe_preflight()
  end

  defp maybe_preflight(%Plug.Conn{method: "OPTIONS"} = conn) do
    conn
    |> send_resp(:no_content, "")
    |> halt()
  end

  defp maybe_preflight(conn), do: conn
end
