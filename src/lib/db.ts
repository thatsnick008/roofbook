import Dexie, { type Table } from "dexie";
import type {
  AppSettings,
  Contact,
  ExpenseEntry,
  IncomeEntry,
  Loan,
  Property,
  PurchaseDetails,
  Reminder,
  StoredDocument,
  SyncMeta,
  Tombstone
} from "./types";

export const SYNC_TABLES = [
  "properties",
  "purchases",
  "loans",
  "income",
  "expenses",
  "contacts",
  "reminders",
  "documents"
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];

let stampWrites = true;

/** Applies server-sourced writes without re-stamping them as local changes. */
export async function applyWithoutStamping<T>(fn: () => Promise<T>): Promise<T> {
  stampWrites = false;
  try {
    return await fn();
  } finally {
    stampWrites = true;
  }
}

export class PropertyCommandCentreDB extends Dexie {
  properties!: Table<Property, string>;
  purchases!: Table<PurchaseDetails, string>;
  loans!: Table<Loan, string>;
  income!: Table<IncomeEntry, string>;
  expenses!: Table<ExpenseEntry, string>;
  contacts!: Table<Contact, string>;
  reminders!: Table<Reminder, string>;
  documents!: Table<StoredDocument, string>;
  settings!: Table<AppSettings, string>;
  tombstones!: Table<Tombstone, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super("property-command-centre");
    this.version(1).stores({
      properties: "id, name, suburb, status, archived, createdAt",
      purchases: "id, propertyId, purchaseDate",
      loans: "id, propertyId, bank",
      income: "id, propertyId, date, category, status",
      expenses: "id, propertyId, date, category, taxDeductible",
      contacts: "id, propertyId, role, renewalDate",
      reminders: "id, propertyId, dueDate, category, completed",
      documents: "id, propertyId, category, uploadedAt",
      settings: "id"
    });

    this.version(2)
      .stores({
        properties: "id, name, suburb, status, archived, createdAt, updatedAt",
        purchases: "id, propertyId, purchaseDate, updatedAt",
        loans: "id, propertyId, bank, updatedAt",
        income: "id, propertyId, date, category, status, updatedAt",
        expenses: "id, propertyId, date, category, taxDeductible, updatedAt",
        contacts: "id, propertyId, role, renewalDate, updatedAt",
        reminders: "id, propertyId, dueDate, category, completed, updatedAt",
        documents: "id, propertyId, category, uploadedAt, updatedAt",
        settings: "id",
        tombstones: "id, table, deletedAt",
        syncMeta: "id"
      })
      .upgrade(async (transaction) => {
        const stamp = new Date().toISOString();
        for (const name of SYNC_TABLES) {
          await transaction
            .table(name)
            .toCollection()
            .modify((row: Record<string, unknown>) => {
              row.updatedAt ??= (row.createdAt as string) ?? stamp;
              if (name === "documents") row.remote ??= false;
            });
        }
      });

    this.registerSyncHooks();
  }

  /** Stamps every local write and records deletions so the sync engine can replay them. */
  private registerSyncHooks(): void {
    SYNC_TABLES.forEach((name) => {
      const table = this.table(name) as Table<Record<string, unknown>, string>;

      table.hook("creating", (_key, object) => {
        if (!stampWrites) return;
        object.updatedAt ??= new Date().toISOString();
      });

      table.hook("updating", (modifications) => {
        if (!stampWrites) return undefined;
        return { ...(modifications as Record<string, unknown>), updatedAt: new Date().toISOString() };
      });

      table.hook("deleting", (key) => {
        if (!stampWrites) return;
        this.tombstones.put({ id: String(key), table: name, deletedAt: new Date().toISOString() });
      });
    });
  }
}

export const db = new PropertyCommandCentreDB();

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const nowIso = (): string => new Date().toISOString();

export const defaultSettings: AppSettings = {
  id: "settings",
  ownerName: "",
  ownerEmail: "",
  currency: "AUD",
  locale: "en-AU",
  financialYearStartMonth: 7,
  theme: "system",
  remindersEnabled: true
};

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("settings");
  if (existing) return existing;
  await db.settings.put(defaultSettings);
  return defaultSettings;
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: "settings" });
}

export async function getSyncMeta(): Promise<SyncMeta> {
  return (await db.syncMeta.get("sync")) ?? { id: "sync" };
}

export async function saveSyncMeta(patch: Partial<SyncMeta>): Promise<void> {
  const current = await getSyncMeta();
  await db.syncMeta.put({ ...current, ...patch, id: "sync" });
}

const writableTables = () => [
  db.properties,
  db.purchases,
  db.loans,
  db.income,
  db.expenses,
  db.contacts,
  db.reminders,
  db.documents,
  db.tombstones
];

export async function deleteProperty(propertyId: string): Promise<void> {
  await db.transaction("rw", writableTables(), async () => {
    await db.properties.delete(propertyId);
    await db.purchases.where("propertyId").equals(propertyId).delete();
    await db.loans.where("propertyId").equals(propertyId).delete();
    await db.income.where("propertyId").equals(propertyId).delete();
    await db.expenses.where("propertyId").equals(propertyId).delete();
    await db.contacts.where("propertyId").equals(propertyId).delete();
    await db.reminders.where("propertyId").equals(propertyId).delete();
    await db.documents.where("propertyId").equals(propertyId).delete();
  });
}

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", [...writableTables(), db.syncMeta], async () => {
    for (const name of SYNC_TABLES) {
      await db.table(name).clear();
    }
    await db.tombstones.clear();
    await db.syncMeta.clear();
  });
}
