import { db } from "./db";
import type {
  Contact,
  CurrencyCode,
  ExpenseEntry,
  IncomeEntry,
  Loan,
  Property,
  PurchaseDetails,
  Reminder,
  StoredDocument
} from "./types";

export interface Snapshot {
  properties: Property[];
  purchases: PurchaseDetails[];
  loans: Loan[];
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
  contacts: Contact[];
  reminders: Reminder[];
  documents: Omit<StoredDocument, "blob">[];
}

/** Exports are scoped to one currency so figures from different portfolios are never summed together. */
export async function loadSnapshot(currency?: CurrencyCode): Promise<Snapshot> {
  const [allProperties, purchases, loans, income, expenses, contacts, reminders, documents] = await Promise.all([
    db.properties.toArray(),
    db.purchases.toArray(),
    db.loans.toArray(),
    db.income.toArray(),
    db.expenses.toArray(),
    db.contacts.toArray(),
    db.reminders.toArray(),
    db.documents.toArray()
  ]);

  const properties = currency
    ? allProperties.filter((property) => (property.currency ?? "AUD") === currency)
    : allProperties;
  const ids = new Set(properties.map((property) => property.id));
  const owned = <T extends { propertyId: string }>(rows: T[]): T[] =>
    currency ? rows.filter((row) => ids.has(row.propertyId)) : rows;
  // Records without a property are portfolio-wide, so they belong in every currency's export.
  const shared = <T extends { propertyId?: string }>(rows: T[]): T[] =>
    currency ? rows.filter((row) => !row.propertyId || ids.has(row.propertyId)) : rows;

  return {
    properties,
    purchases: owned(purchases),
    loans: owned(loans),
    income: owned(income),
    expenses: owned(expenses),
    contacts: shared(contacts),
    reminders: shared(reminders),
    documents: shared(documents).map(({ blob: _blob, ...rest }) => rest)
  };
}

export function propertyNameMap(properties: Property[]): Map<string, string> {
  return new Map(properties.map((property) => [property.id, property.name]));
}
