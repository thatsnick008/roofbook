CREATE TABLE IF NOT EXISTS "record_revisions" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "table_name" text NOT NULL,
  "record_id" text NOT NULL,
  "version" integer NOT NULL,
  "data" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "record_revisions_lookup_idx"
  ON "record_revisions" ("user_id", "table_name", "record_id", "version");
