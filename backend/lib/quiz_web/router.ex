defmodule QuizWeb.Router do
  @moduledoc """
  Defines the API pipelines and routes exposed by the service.
  """

  use QuizWeb, :router

  pipeline :api do
    plug(:accepts, ["json"])

    plug(Plug.Parsers,
      parsers: [:json, :urlencoded, :multipart],
      pass: ["*/*"],
      json_decoder: Jason
    )

    plug(QuizWeb.Plugs.CORS)
  end

  pipeline :auth do
    plug(QuizWeb.Plugs.Auth)
  end

  scope "/api", QuizWeb do
    pipe_through([:api])

    options("/*path", PreflightController, :options)
    post("/auth/register", AuthController, :register)
    post("/auth/login", AuthController, :login)
    post("/games/check_nickname", GamePublicController, :check)
  end

  scope "/api", QuizWeb do
    pipe_through([:api, :auth])

    resources("/quizzes", QuizController, except: [:new, :edit])
    post("/games", GameController, :create)
  end
end
