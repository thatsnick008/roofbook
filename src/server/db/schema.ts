import { boolean, doublePrecision, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

const owned = {
  id: text("id").notNull(),
  userId: text("user_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
};

export const properties = pgTable(
  "properties",
  {
    ...owned,
    name: text("name").notNull(),
    address: text("address").notNull().default(""),
    suburb: text("suburb").notNull().default(""),
    state: text("state").notNull().default(""),
    postcode: text("postcode").notNull().default(""),
    country: text("country").notNull().default("Australia"),
    type: text("type").notNull().default("house"),
    status: text("status").notNull().default("owned"),
    bedrooms: integer("bedrooms").notNull().default(0),
    bathrooms: integer("bathrooms").notNull().default(0),
    carSpaces: integer("car_spaces").notNull().default(0),
    landSize: doublePrecision("land_size").notNull().default(0),
    currentValuation: doublePrecision("current_valuation").notNull().default(0),
    annualDepreciation: doublePrecision("annual_depreciation").notNull().default(0),
    managementFeePercent: doublePrecision("management_fee_percent").notNull().default(5.5),
    managementFeeType: text("management_fee_type").notNull().default("percent"),
    managementFeeFixed: doublePrecision("management_fee_fixed").notNull().default(0),
    annualRent: doublePrecision("annual_rent").notNull().default(0),
    rentFrequency: text("rent_frequency").notNull().default("monthly"),
    currency: text("currency").notNull().default("AUD"),
    valuationDate: text("valuation_date"),
    accent: text("accent").notNull().default("#2563eb"),
    taxTreatment: text("tax_treatment").notNull().default("offset"),
    notes: text("notes"),
    archived: boolean("archived").notNull().default(false),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userIdx: index("properties_user_idx").on(table.userId, table.updatedAt)
  })
);

export const purchases = pgTable(
  "purchases",
  {
    ...owned,
    propertyId: text("property_id").notNull(),
    purchaseDate: text("purchase_date").notNull(),
    settlementDate: text("settlement_date"),
    valuation: doublePrecision("valuation").notNull().default(0),
    purchasePrice: doublePrecision("purchase_price").notNull().default(0),
    loanBeforeLmi: doublePrecision("loan_before_lmi").notNull().default(0),
    lmi: doublePrecision("lmi").notNull().default(0),
    loanAfterLmi: doublePrecision("loan_after_lmi").notNull().default(0),
    deposit: doublePrecision("deposit").notNull().default(0),
    stampDuty: doublePrecision("stamp_duty").notNull().default(0),
    legalFees: doublePrecision("legal_fees").notNull().default(0),
    renovations: doublePrecision("renovations").notNull().default(0),
    settlementFees: doublePrecision("settlement_fees").notNull().default(0),
    buildingAndPest: doublePrecision("building_and_pest").notNull().default(0),
    registrationFees: doublePrecision("registration_fees").notNull().default(0),
    otherCosts: doublePrecision("other_costs").notNull().default(0)
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userIdx: index("purchases_user_idx").on(table.userId, table.updatedAt)
  })
);

export const loans = pgTable(
  "loans",
  {
    ...owned,
    propertyId: text("property_id").notNull(),
    bank: text("bank").notNull().default(""),
    accountName: text("account_name").notNull().default(""),
    accountNumber: text("account_number"),
    loanBalance: doublePrecision("loan_balance").notNull().default(0),
    offsetBalance: doublePrecision("offset_balance").notNull().default(0),
    interestRate: doublePrecision("interest_rate").notNull().default(0),
    repaymentType: text("repayment_type").notNull().default("interest-only"),
    interestOnlyMonths: integer("interest_only_months").notNull().default(0),
    principalAndInterestMonths: integer("principal_and_interest_months").notNull().default(0),
    repaymentFrequency: text("repayment_frequency").notNull().default("monthly"),
    fixedUntil: text("fixed_until"),
    startDate: text("start_date").notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userIdx: index("loans_user_idx").on(table.userId, table.updatedAt)
  })
);

export const income = pgTable(
  "income",
  {
    ...owned,
    propertyId: text("property_id").notNull(),
    date: text("date").notNull(),
    periodStart: text("period_start"),
    periodEnd: text("period_end"),
    category: text("category").notNull().default("rent"),
    status: text("status").notNull().default("received"),
    amount: doublePrecision("amount").notNull().default(0),
    managementFee: doublePrecision("management_fee").notNull().default(0),
    notes: text("notes"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userIdx: index("income_user_idx").on(table.userId, table.updatedAt)
  })
);

export const expenses = pgTable(
  "expenses",
  {
    ...owned,
    propertyId: text("property_id").notNull(),
    date: text("date").notNull(),
    category: text("category").notNull().default("other"),
    supplier: text("supplier"),
    amount: doublePrecision("amount").notNull().default(0),
    gst: doublePrecision("gst").notNull().default(0),
    taxDeductible: boolean("tax_deductible").notNull().default(true),
    capital: boolean("capital").notNull().default(false),
    documentId: text("document_id"),
    notes: text("notes"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userIdx: index("expenses_user_idx").on(table.userId, table.updatedAt)
  })
);

export const contacts = pgTable(
  "contacts",
  {
    ...owned,
    propertyId: text("property_id"),
    name: text("name").notNull(),
    role: text("role").notNull().default("other"),
    company: text("company"),
    phone: text("phone"),
    email: text("email"),
    policyNumber: text("policy_number"),
    renewalDate: text("renewal_date"),
    premium: doublePrecision("premium"),
    notes: text("notes"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userIdx: index("contacts_user_idx").on(table.userId, table.updatedAt)
  })
);

export const reminders = pgTable(
  "reminders",
  {
    ...owned,
    propertyId: text("property_id"),
    title: text("title").notNull(),
    category: text("category").notNull().default("custom"),
    dueDate: text("due_date").notNull(),
    recurrence: text("recurrence").notNull().default("none"),
    leadDays: jsonb("lead_days").$type<number[]>().notNull().default([]),
    notifyEmail: text("notify_email"),
    completed: boolean("completed").notNull().default(false),
    completedAt: text("completed_at"),
    notes: text("notes"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    dueIdx: index("reminders_due_idx").on(table.dueDate),
    userIdx: index("reminders_user_idx").on(table.userId, table.updatedAt)
  })
);

export const documents = pgTable(
  "documents",
  {
    ...owned,
    propertyId: text("property_id"),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull().default("application/octet-stream"),
    size: integer("size").notNull().default(0),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    category: text("category").notNull().default("other"),
    /** Vercel Blob URL. Never returned to the browser — downloads are proxied through the API. */
    blobUrl: text("blob_url"),
    uploadedAt: text("uploaded_at").notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userIdx: index("documents_user_idx").on(table.userId, table.updatedAt)
  })
);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  ownerName: text("owner_name").notNull().default(""),
  ownerEmail: text("owner_email").notNull().default(""),
  remindersEnabled: boolean("reminders_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

/** One row per subscribed browser/device so a user can get push reminders on every installed instance. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdx: index("push_subscriptions_user_idx").on(table.userId),
    endpointIdx: index("push_subscriptions_endpoint_idx").on(table.endpoint)
  })
);

/** Snapshot of a row taken before it's overwritten or deleted, capped at 5 per record so history is never lost. */
export const recordRevisions = pgTable(
  "record_revisions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tableName: text("table_name").notNull(),
    recordId: text("record_id").notNull(),
    version: integer("version").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    lookupIdx: index("record_revisions_lookup_idx").on(table.userId, table.tableName, table.recordId, table.version)
  })
);

export const schema = {
  properties,
  purchases,
  loans,
  income,
  expenses,
  contacts,
  reminders,
  documents,
  userSettings,
  users,
  passwordResetTokens,
  recordRevisions,
  pushSubscriptions
};
