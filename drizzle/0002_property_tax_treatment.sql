ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "tax_treatment" text NOT NULL DEFAULT 'offset';