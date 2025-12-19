defmodule Quiz.Repo do
  @moduledoc """
  Ecto repository wrapper for database access.
  """

  use Ecto.Repo,
    otp_app: :backend,
    adapter: Ecto.Adapters.Postgres
end
