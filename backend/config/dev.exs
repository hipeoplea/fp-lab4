import Config

config :backend, Quiz.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  port: 5433,
  database: "lab4app",
  pool_size: 10
