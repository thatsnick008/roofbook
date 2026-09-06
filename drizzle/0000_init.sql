-- Property Command Centre schema. Run once against your Neon/Postgres database
-- (Neon SQL editor, psql, or `npm run db:push`).

CREATE TABLE IF NOT EXISTS "properties" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "name" text NOT NULL,
  "address" text NOT NULL DEFAULT '',
  "suburb" text NOT NULL DEFAULT '',
  "state" text NOT NULL DEFAULT '',
  "postcode" text NOT NULL DEFAULT '',
  "country" text NOT NULL DEFAULT 'Australia',
  "type" text NOT NULL DEFAULT 'house',
  "status" text NOT NULL DEFAULT 'owned',
  "bedrooms" integer NOT NULL DEFAULT 0,
  "bathrooms" integer NOT NULL DEFAULT 0,
  "car_spaces" integer NOT NULL DEFAULT 0,
  "land_size" double precision NOT NULL DEFAULT 0,
  "current_valuation" double precision NOT NULL DEFAULT 0,
  "valuation_date" text,
  "accent" text NOT NULL DEFAULT '#2563eb',
  "notes" text,
  "archived" boolean NOT NULL DEFAULT false,
  "created_at" text NOT NULL,
  CONSTRAINT "properties_pk" PRIMARY KEY ("user_id", "id")
);

CREATE TABLE IF NOT EXISTS "purchases" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "property_id" text NOT NULL,
  "purchase_date" text NOT NULL,
  "settlement_date" text,
  "valuation" double precision NOT NULL DEFAULT 0,
  "purchase_price" double precision NOT NULL DEFAULT 0,
  "loan_before_lmi" double precision NOT NULL DEFAULT 0,
  "lmi" double precision NOT NULL DEFAULT 0,
  "loan_after_lmi" double precision NOT NULL DEFAULT 0,
  "deposit" double precision NOT NULL DEFAULT 0,
  "stamp_duty" double precision NOT NULL DEFAULT 0,
  "legal_fees" double precision NOT NULL DEFAULT 0,
  "renovations" double precision NOT NULL DEFAULT 0,
  "settlement_fees" double precision NOT NULL DEFAULT 0,
  "building_and_pest" double precision NOT NULL DEFAULT 0,
  "registration_fees" double precision NOT NULL DEFAULT 0,
  "other_costs" double precision NOT NULL DEFAULT 0,
  CONSTRAINT "purchases_pk" PRIMARY KEY ("user_id", "id")
);

CREATE TABLE IF NOT EXISTS "loans" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "property_id" text NOT NULL,
  "bank" text NOT NULL DEFAULT '',
  "account_name" text NOT NULL DEFAULT '',
  "account_number" text,
  "loan_balance" double precision NOT NULL DEFAULT 0,
  "offset_balance" double precision NOT NULL DEFAULT 0,
  "interest_rate" double precision NOT NULL DEFAULT 0,
  "repayment_type" text NOT NULL DEFAULT 'interest-only',
  "interest_only_months" integer NOT NULL DEFAULT 0,
  "principal_and_interest_months" integer NOT NULL DEFAULT 0,
  "repayment_frequency" text NOT NULL DEFAULT 'monthly',
  "fixed_until" text,
  "start_date" text NOT NULL,
  CONSTRAINT "loans_pk" PRIMARY KEY ("user_id", "id")
);

CREATE TABLE IF NOT EXISTS "income" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "property_id" text NOT NULL,
  "date" text NOT NULL,
  "period_start" text,
  "period_end" text,
  "category" text NOT NULL DEFAULT 'rent',
  "status" text NOT NULL DEFAULT 'received',
  "amount" double precision NOT NULL DEFAULT 0,
  "management_fee" double precision NOT NULL DEFAULT 0,
  "notes" text,
  "created_at" text NOT NULL,
  CONSTRAINT "income_pk" PRIMARY KEY ("user_id", "id")
);

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "property_id" text NOT NULL,
  "date" text NOT NULL,
  "category" text NOT NULL DEFAULT 'other',
  "supplier" text,
  "amount" double precision NOT NULL DEFAULT 0,
  "gst" double precision NOT NULL DEFAULT 0,
  "tax_deductible" boolean NOT NULL DEFAULT true,
  "capital" boolean NOT NULL DEFAULT false,
  "document_id" text,
  "notes" text,
  "created_at" text NOT NULL,
  CONSTRAINT "expenses_pk" PRIMARY KEY ("user_id", "id")
);

CREATE TABLE IF NOT EXISTS "contacts" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "property_id" text,
  "name" text NOT NULL,
  "role" text NOT NULL DEFAULT 'other',
  "company" text,
  "phone" text,
  "email" text,
  "policy_number" text,
  "renewal_date" text,
  "premium" double precision,
  "notes" text,
  "created_at" text NOT NULL,
  CONSTRAINT "contacts_pk" PRIMARY KEY ("user_id", "id")
);

CREATE TABLE IF NOT EXISTS "reminders" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "property_id" text,
  "title" text NOT NULL,
  "category" text NOT NULL DEFAULT 'custom',
  "due_date" text NOT NULL,
  "recurrence" text NOT NULL DEFAULT 'none',
  "lead_days" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "notify_email" text,
  "completed" boolean NOT NULL DEFAULT false,
  "completed_at" text,
  "notes" text,
  "created_at" text NOT NULL,
  CONSTRAINT "reminders_pk" PRIMARY KEY ("user_id", "id")
);

CREATE TABLE IF NOT EXISTS "documents" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "property_id" text,
  "name" text NOT NULL,
  "mime_type" text NOT NULL DEFAULT 'application/octet-stream',
  "size" integer NOT NULL DEFAULT 0,
  "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "category" text NOT NULL DEFAULT 'other',
  "blob_url" text,
  "uploaded_at" text NOT NULL,
  CONSTRAINT "documents_pk" PRIMARY KEY ("user_id", "id")
);

CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" text PRIMARY KEY,
  "owner_name" text NOT NULL DEFAULT '',
  "owner_email" text NOT NULL DEFAULT '',
  "reminders_enabled" boolean NOT NULL DEFAULT true,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "properties_user_idx" ON "properties" ("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "purchases_user_idx" ON "purchases" ("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "loans_user_idx" ON "loans" ("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "income_user_idx" ON "income" ("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "expenses_user_idx" ON "expenses" ("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "contacts_user_idx" ON "contacts" ("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "reminders_user_idx" ON "reminders" ("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "reminders_due_idx" ON "reminders" ("due_date");
CREATE INDEX IF NOT EXISTS "documents_user_idx" ON "documents" ("user_id", "updated_at");
