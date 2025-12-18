defmodule Backend.MixProject do
  use Mix.Project

  def project do
    [
      app: :backend,
      version: "0.1.0",
      elixir: "~> 1.14",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      mod: {Quiz.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:phoenix, "~> 1.7"},
      {:phoenix_ecto, "~> 4.6"},
      {:ecto_sql, "~> 3.11"},
      {:postgrex, ">= 0.0.0"},

      {:argon2_elixir, "~> 4.0"},
      {:joken, "~> 2.6"},
      {:jason, "~> 1.4"},
      {:plug_cowboy, "~> 2.7"}
    ]
  end
end
