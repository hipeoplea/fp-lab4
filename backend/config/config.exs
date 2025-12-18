import Config

jwt_secret = System.get_env("JWT_SECRET") || "dev-secret"

config :backend,
  ecto_repos: [Quiz.Repo],
  jwt_secret: jwt_secret

config :phoenix, :json_library, Jason

config :backend, QuizWeb.Endpoint,
  pubsub_server: Quiz.PubSub,
  secret_key_base:
    System.get_env("SECRET_KEY_BASE") ||
      "dev_secret_key_base_change_me_please"

import_config "#{config_env()}.exs"
