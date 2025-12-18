import Config

jwt_secret = System.get_env("JWT_SECRET") || "dev-secret"

config :backend,
  ecto_repos: [Quiz.Repo],
  jwt_secret: jwt_secret

config :phoenix, :json_library, Jason

import_config "#{config_env()}.exs"
