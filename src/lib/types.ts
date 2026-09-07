export type ID = string;

export type PropertyStatus = "owned" | "under-contract" | "listed" | "sold";
export type PropertyType = "house" | "townhouse" | "unit" | "duplex" | "land" | "commercial";
export type PropertyTaxTreatment = "offset" | "retain";

export interface Property {
  id: ID;
  name: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  type: PropertyType;
  status: PropertyStatus;
  bedrooms: number;
  bathrooms: number;
  carSpaces: number;
  landSize: number;
  currentValuation: number;
  annualDepreciation: number;
  managementFeePercent: number;
  valuationDate?: string;
  accent: string;
  taxTreatment: PropertyTaxTreatment;
  notes?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseDetails {
  id: ID;
  propertyId: ID;
  purchaseDate: string;
  settlementDate?: string;
  valuation: number;
  purchasePrice: number;
  loanBeforeLmi: number;
  lmi: number;
  loanAfterLmi: number;
  deposit: number;
  stampDuty: number;
  legalFees: number;
  renovations: number;
  settlementFees: number;
  buildingAndPest: number;
  registrationFees: number;
  otherCosts: number;
  updatedAt: string;
}

export type RepaymentType = "interest-only" | "principal-and-interest";

export interface Loan {
  id: ID;
  propertyId: ID;
  bank: string;
  accountName: string;
  accountNumber?: string;
  loanBalance: number;
  offsetBalance: number;
  interestRate: number;
  repaymentType: RepaymentType;
  interestOnlyMonths: number;
  principalAndInterestMonths: number;
  repaymentFrequency: "weekly" | "fortnightly" | "monthly";
  fixedUntil?: string;
  startDate: string;
  updatedAt: string;
}

export type IncomeCategory = "rent" | "arrears-recovery" | "insurance-payout" | "bond-claim" | "other";
export type IncomeStatus = "received" | "pending" | "arrears" | "vacant";

export interface IncomeEntry {
  id: ID;
  propertyId: ID;
  date: string;
  periodStart?: string;
  periodEnd?: string;
  category: IncomeCategory;
  status: IncomeStatus;
  amount: number;
  managementFee: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ExpenseCategory =
  | "council-rates"
  | "water"
  | "building-insurance"
  | "landlord-insurance"
  | "property-management"
  | "leasing-fee"
  | "advertising"
  | "maintenance"
  | "smoke-alarm"
  | "gas-electrical"
  | "pest-control"
  | "strata"
  | "land-tax"
  | "interest"
  | "accounting"
  | "capital-works"
  | "other";

export interface ExpenseEntry {
  id: ID;
  propertyId: ID;
  date: string;
  category: ExpenseCategory;
  supplier?: string;
  amount: number;
  gst: number;
  taxDeductible: boolean;
  capital: boolean;
  documentId?: ID;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ContactRole =
  | "property-manager"
  | "insurer"
  | "accountant"
  | "broker"
  | "tradesperson"
  | "conveyancer"
  | "tenant"
  | "other";

export interface Contact {
  id: ID;
  propertyId?: ID;
  name: string;
  role: ContactRole;
  company?: string;
  phone?: string;
  email?: string;
  policyNumber?: string;
  renewalDate?: string;
  premium?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ReminderCategory =
  | "insurance-renewal"
  | "lease-expiry"
  | "rent-review"
  | "termite-inspection"
  | "smoke-alarm"
  | "gas-electrical"
  | "air-conditioner"
  | "land-tax"
  | "loan-review"
  | "custom";

export type Recurrence = "none" | "monthly" | "quarterly" | "half-yearly" | "yearly";

export interface Reminder {
  id: ID;
  propertyId?: ID;
  title: string;
  category: ReminderCategory;
  dueDate: string;
  recurrence: Recurrence;
  leadDays: number[];
  notifyEmail?: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StoredDocument {
  id: ID;
  propertyId?: ID;
  name: string;
  mimeType: string;
  size: number;
  tags: string[];
  category: string;
  /** Absent for documents pulled from the cloud that have not been cached locally yet. */
  blob?: Blob;
  remote: boolean;
  uploadedAt: string;
  updatedAt?: string;
}

/** Local-only record of a deletion so the change can be replayed to the server. */
export interface Tombstone {
  id: ID;
  table: string;
  deletedAt: string;
}

export interface SyncMeta {
  id: "sync";
  lastSyncedAt?: string;
  lastError?: string;
  userId?: string;
}

export interface AppSettings {
  id: "settings";
  ownerName: string;
  ownerEmail: string;
  currency: string;
  locale: string;
  financialYearStartMonth: number;
  theme: "light" | "dark" | "system";
  remindersEnabled: boolean;
  lastBackupAt?: string;
}

export interface PortfolioTotals {
  properties: number;
  valuation: number;
  debt: number;
  offset: number;
  equity: number;
  lvr: number;
  netLvr: number;
  income: number;
  expenses: number;
  cashflow: number;
  grossYield: number;
  netYield: number;
}
