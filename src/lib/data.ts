import { db } from "./db";
import type {
  Contact,
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

export async function loadSnapshot(): Promise<Snapshot> {
  const [properties, purchases, loans, income, expenses, contacts, reminders, documents] = await Promise.all([
    db.properties.toArray(),
    db.purchases.toArray(),
    db.loans.toArray(),
    db.income.toArray(),
    db.expenses.toArray(),
    db.contacts.toArray(),
    db.reminders.toArray(),
    db.documents.toArray()
  ]);

  return {
    properties,
    purchases,
    loans,
    income,
    expenses,
    contacts,
    reminders,
    documents: documents.map(({ blob: _blob, ...rest }) => rest)
  };
}

export function propertyNameMap(properties: Property[]): Map<string, string> {
  return new Map(properties.map((property) => [property.id, property.name]));
}
