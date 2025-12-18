defmodule QuizWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :backend

  socket "/socket", QuizWeb.UserSocket,
    websocket: [connect_info: [:peer_data]],
    longpoll: false

  plug Plug.RequestId
  plug Plug.Logger
  plug QuizWeb.Router
end
