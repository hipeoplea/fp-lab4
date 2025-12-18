defmodule Quiz.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      Quiz.Repo,
      {Plug.Cowboy, scheme: :http, plug: QuizWeb.Router, options: [port: cowboy_port()]}
    ]

    opts = [strategy: :one_for_one, name: Quiz.Supervisor]
    Supervisor.start_link(children, opts)
  end

  defp cowboy_port do
    case Integer.parse(System.get_env("PORT", "4000")) do
      {port, ""} -> port
      _ -> 4000
    end
  end
end
