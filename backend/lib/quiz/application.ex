defmodule Quiz.Application do
  @moduledoc """
  OTP application callback tree for the quiz backend.
  """

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      Quiz.Repo,
      {Phoenix.PubSub, name: Quiz.PubSub},
      {Registry, keys: :unique, name: Quiz.GameRegistry},
      Quiz.GameSupervisor,
      QuizWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: Quiz.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
