ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "annual_depreciation" double precision NOT NULL DEFAULT 0;