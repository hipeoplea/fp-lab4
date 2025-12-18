import Config

# Use a transient database connection for tests if needed
config :backend, Quiz.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  port: 5433,
  database: "lab4app_test",
  pool: Ecto.Adapters.SQL.Sandbox

config :backend, :jwt_secret, System.get_env("JWT_SECRET") || "dev-secret"
