import type {
  ContactRole,
  CurrencyCode,
  ExpenseCategory,
  IncomeCategory,
  IncomeStatus,
  PropertyStatus,
  PropertyType,
  RentFrequency,
  Recurrence,
  ReminderCategory
} from "./types";

export const propertyTypes: PropertyType[] = ["house", "townhouse", "unit", "duplex", "land", "commercial"];
export const propertyStatuses: PropertyStatus[] = ["owned", "under-contract", "listed", "sold"];
export const currencies: { code: CurrencyCode; label: string }[] = [
  { code: "AUD", label: "A$ Australian dollar" },
  { code: "USD", label: "$ US dollar" },
  { code: "INR", label: "₹ Indian rupee" },
  { code: "GBP", label: "£ British pound" },
  { code: "EUR", label: "€ Euro" },
  { code: "NZD", label: "NZ$ New Zealand dollar" },
  { code: "SGD", label: "S$ Singapore dollar" },
  { code: "CAD", label: "C$ Canadian dollar" }
];
export const rentFrequencies: RentFrequency[] = ["weekly", "fortnightly", "monthly"];
export const incomeCategories: IncomeCategory[] = ["rent", "arrears-recovery", "insurance-payout", "bond-claim", "other"];
export const incomeStatuses: IncomeStatus[] = ["received", "pending", "arrears", "vacant"];

export const expenseCategories: ExpenseCategory[] = [
  "council-rates",
  "water",
  "building-insurance",
  "landlord-insurance",
  "property-management",
  "leasing-fee",
  "advertising",
  "maintenance",
  "smoke-alarm",
  "gas-electrical",
  "pest-control",
  "strata",
  "land-tax",
  "interest",
  "accounting",
  "capital-works",
  "other"
];

export const contactRoles: ContactRole[] = [
  "property-manager",
  "insurer",
  "accountant",
  "broker",
  "tradesperson",
  "conveyancer",
  "tenant",
  "other"
];

export const reminderCategories: ReminderCategory[] = [
  "insurance-renewal",
  "lease-expiry",
  "rent-review",
  "termite-inspection",
  "smoke-alarm",
  "gas-electrical",
  "air-conditioner",
  "land-tax",
  "loan-review",
  "custom"
];

export const recurrences: Recurrence[] = ["none", "monthly", "quarterly", "half-yearly", "yearly"];

export const documentCategories = [
  "contract",
  "loan",
  "insurance",
  "invoice",
  "receipt",
  "lease",
  "inspection",
  "statement",
  "tax",
  "other"
];

export const accentPalette = [
  "#2563eb",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6"
];

export const defaultLeadDays = [90, 60, 30, 14, 7, 1];

export const australianStates = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];
