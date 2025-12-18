import Config

port =
  case Integer.parse(System.get_env("PORT", "4000")) do
    {num, ""} -> num
    _ -> 4000
  end

config :backend, QuizWeb.Endpoint,
  http: [port: port],
  server: true
