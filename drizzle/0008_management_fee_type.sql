ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "management_fee_type" text NOT NULL DEFAULT 'percent';
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "management_fee_fixed" double precision NOT NULL DEFAULT 0;
