defmodule QuizWeb.Auth.Token do
  @moduledoc false

  @issuer "quiz"

  def generate(user) do
    now = DateTime.utc_now() |> DateTime.to_unix()

    claims = %{
      "iss" => @issuer,
      "sub" => to_string(user.id),
      "iat" => now,
      "exp" => now + 60 * 60 * 24 * 7
    }

    case Joken.generate_and_sign(%{}, claims, signer()) do
      {:ok, token, _claims} -> {:ok, token}
      error -> error
    end
  end

  def verify(token) when is_binary(token) do
    case Joken.verify(token, signer()) do
      {:ok, claims} ->
        if Map.get(claims, "iss") == @issuer, do: {:ok, claims}, else: {:error, :invalid_token}

      _ ->
        {:error, :invalid_token}
    end
  end

  defp signer do
    secret =
      Application.get_env(:backend, :jwt_secret) ||
        System.get_env("JWT_SECRET") ||
        raise "JWT_SECRET is not set (export JWT_SECRET=...)"

    Joken.Signer.create("HS256", secret)
  end
end
