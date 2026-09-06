import { z } from "zod";
import { contacts, documents, expenses, income, loans, properties, purchases, reminders } from "../db/schema";

const iso = z.string().min(4).max(40);
const money = z.number().finite().default(0);
const text = (max = 400) => z.string().max(max);

const base = { id: z.string().min(1).max(64), updatedAt: iso };

const propertySchema = z.object({
  ...base,
  name: text(160),
  address: text(240).default(""),
  suburb: text(120).default(""),
  state: text(16).default(""),
  postcode: text(12).default(""),
  country: text(80).default("Australia"),
  type: text(32).default("house"),
  status: text(32).default("owned"),
  bedrooms: z.number().int().min(0).max(99).default(0),
  bathrooms: z.number().int().min(0).max(99).default(0),
  carSpaces: z.number().int().min(0).max(99).default(0),
  landSize: money,
  currentValuation: money,
  annualDepreciation: money,
  valuationDate: text(40).optional().nullable(),
  accent: text(32).default("#2563eb"),
  taxTreatment: z.enum(["offset", "retain"]).default("offset"),
  notes: text(4000).optional().nullable(),
  archived: z.boolean().default(false),
  createdAt: iso
});

const purchaseSchema = z.object({
  ...base,
  propertyId: z.string().min(1).max(64),
  purchaseDate: text(40),
  settlementDate: text(40).optional().nullable(),
  valuation: money,
  purchasePrice: money,
  loanBeforeLmi: money,
  lmi: money,
  loanAfterLmi: money,
  deposit: money,
  stampDuty: money,
  legalFees: money,
  renovations: money,
  settlementFees: money,
  buildingAndPest: money,
  registrationFees: money,
  otherCosts: money
});

const loanSchema = z.object({
  ...base,
  propertyId: z.string().min(1).max(64),
  bank: text(120).default(""),
  accountName: text(120).default(""),
  accountNumber: text(64).optional().nullable(),
  loanBalance: money,
  offsetBalance: money,
  interestRate: z.number().finite().min(0).max(100).default(0),
  repaymentType: text(32).default("interest-only"),
  interestOnlyMonths: z.number().int().min(0).max(1200).default(0),
  principalAndInterestMonths: z.number().int().min(0).max(1200).default(0),
  repaymentFrequency: text(24).default("monthly"),
  fixedUntil: text(40).optional().nullable(),
  startDate: text(40)
});

const incomeSchema = z.object({
  ...base,
  propertyId: z.string().min(1).max(64),
  date: text(40),
  periodStart: text(40).optional().nullable(),
  periodEnd: text(40).optional().nullable(),
  category: text(40).default("rent"),
  status: text(24).default("received"),
  amount: money,
  managementFee: money,
  notes: text(4000).optional().nullable(),
  createdAt: iso
});

const expenseSchema = z.object({
  ...base,
  propertyId: z.string().min(1).max(64),
  date: text(40),
  category: text(40).default("other"),
  supplier: text(160).optional().nullable(),
  amount: money,
  gst: money,
  taxDeductible: z.boolean().default(true),
  capital: z.boolean().default(false),
  documentId: z.string().max(64).optional().nullable(),
  notes: text(4000).optional().nullable(),
  createdAt: iso
});

const contactSchema = z.object({
  ...base,
  propertyId: z.string().max(64).optional().nullable(),
  name: text(160),
  role: text(40).default("other"),
  company: text(160).optional().nullable(),
  phone: text(40).optional().nullable(),
  email: text(200).optional().nullable(),
  policyNumber: text(80).optional().nullable(),
  renewalDate: text(40).optional().nullable(),
  premium: z.number().finite().optional().nullable(),
  notes: text(4000).optional().nullable(),
  createdAt: iso
});

const reminderSchema = z.object({
  ...base,
  propertyId: z.string().max(64).optional().nullable(),
  title: text(200),
  category: text(40).default("custom"),
  dueDate: text(40),
  recurrence: text(24).default("none"),
  leadDays: z.array(z.number().int().min(0).max(3650)).max(12).default([]),
  notifyEmail: z.string().email().max(200).optional().nullable(),
  completed: z.boolean().default(false),
  completedAt: text(40).optional().nullable(),
  notes: text(4000).optional().nullable(),
  createdAt: iso
});

const documentSchema = z.object({
  ...base,
  propertyId: z.string().max(64).optional().nullable(),
  name: text(240),
  mimeType: text(120).default("application/octet-stream"),
  size: z.number().int().min(0).default(0),
  tags: z.array(text(40)).max(20).default([]),
  category: text(40).default("other"),
  uploadedAt: iso
});

export const registry = {
  properties: { table: properties, schema: propertySchema },
  purchases: { table: purchases, schema: purchaseSchema },
  loans: { table: loans, schema: loanSchema },
  income: { table: income, schema: incomeSchema },
  expenses: { table: expenses, schema: expenseSchema },
  contacts: { table: contacts, schema: contactSchema },
  reminders: { table: reminders, schema: reminderSchema },
  documents: { table: documents, schema: documentSchema }
} as const;

export type RegistryKey = keyof typeof registry;

export const registryKeys = Object.keys(registry) as RegistryKey[];

export const syncRequestSchema = z.object({
  since: iso.optional(),
  changes: z.record(z.string(), z.array(z.record(z.string(), z.unknown())).max(2000)).default({}),
  deletes: z
    .array(z.object({ table: z.string().max(40), id: z.string().max(64), deletedAt: iso }))
    .max(2000)
    .default([]),
  settings: z
    .object({
      ownerName: text(160).default(""),
      ownerEmail: z.string().email().max(200).or(z.literal("")).default(""),
      remindersEnabled: z.boolean().default(true)
    })
    .optional()
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;
