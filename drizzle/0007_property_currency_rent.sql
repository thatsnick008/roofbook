ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "annual_rent" double precision NOT NULL DEFAULT 0;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "rent_frequency" text NOT NULL DEFAULT 'monthly';
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'AUD';