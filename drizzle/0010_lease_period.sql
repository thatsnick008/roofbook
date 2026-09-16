ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "lease_start" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "lease_end" text;
