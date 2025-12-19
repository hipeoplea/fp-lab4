# Used by "mix format"
locals_without_parens = [
  # Ecto.Schema
  field: 1,
  field: 2,
  field: 3,
  belongs_to: 2,
  belongs_to: 3,
  has_many: 2,
  has_many: 3,
  has_one: 2,
  has_one: 3,
  timestamps: 1,
  timestamps: 2,
  embeds_one: 2,
  embeds_one: 3,
  embeds_one: 4,
  embeds_many: 2,
  embeds_many: 3,
  embeds_many: 4,
  # Phoenix.Router / Controller helpers
  pipe_through: 1,
  pipe_through: 2,
  plug: 1,
  plug: 2,
  get: 2,
  post: 2,
  put: 2,
  patch: 2,
  delete: 2,
  options: 2,
  head: 2,
  resources: 2,
  scope: 2,
  scope: 3,
  live: 2,
  live: 3,
  live_session: 2,
  live_session: 3
]

[
  import_deps: [:ecto, :phoenix],
  inputs:
    ["{mix,.formatter}.exs", "{config,lib,test}/**/*.{ex,exs}"] ++
      ["priv/*/seeds.exs", "priv/repo/migrations/*.exs"],
  locals_without_parens: locals_without_parens,
  export: [locals_without_parens: locals_without_parens],
  line_length: 120
]
