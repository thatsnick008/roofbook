CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "token" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);