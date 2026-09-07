ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "management_fee_percent" double precision NOT NULL DEFAULT 5.5;
