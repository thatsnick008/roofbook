import { db, getSettings, saveSettings } from "../db";
import { loadSnapshot } from "../data";
import { triggerDownload } from "./excel";
import type { Snapshot } from "../data";

const BACKUP_VERSION = 1;

export interface BackupFile {
  version: number;
  exportedAt: string;
  app: "roofbook";
  data: Snapshot;
  settings: Record<string, unknown>;
}

export async function exportBackup(): Promise<void> {
  const [data, settings] = await Promise.all([loadSnapshot(), getSettings()]);
  const payload: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: "roofbook",
    data,
    settings: settings as unknown as Record<string, unknown>
  };
  const backupJson = JSON.stringify(payload, null, 2).replace(/pk\s+gupta/gi, "");
  const blob = new Blob([backupJson], { type: "application/json" });
  triggerDownload(blob, `pcc-backup-${new Date().toISOString().slice(0, 10)}.json`);
  await saveSettings({ lastBackupAt: new Date().toISOString() });
}

export async function importBackup(file: File, mode: "merge" | "replace" = "merge"): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text) as BackupFile;
  if (parsed.app !== "roofbook" && parsed.app !== "roof-book" && parsed.app !== "property-command-centre") {
    throw new Error("This file is not a Roofbook backup.");
  }

  await db.transaction(
    "rw",
    [db.properties, db.purchases, db.loans, db.income, db.expenses, db.contacts, db.reminders, db.settings],
    async () => {
      if (mode === "replace") {
        await Promise.all([
          db.properties.clear(),
          db.purchases.clear(),
          db.loans.clear(),
          db.income.clear(),
          db.expenses.clear(),
          db.contacts.clear(),
          db.reminders.clear()
        ]);
      }
      await Promise.all([
        db.properties.bulkPut(parsed.data.properties ?? []),
        db.purchases.bulkPut(parsed.data.purchases ?? []),
        db.loans.bulkPut(parsed.data.loans ?? []),
        db.income.bulkPut(parsed.data.income ?? []),
        db.expenses.bulkPut(parsed.data.expenses ?? []),
        db.contacts.bulkPut(parsed.data.contacts ?? []),
        db.reminders.bulkPut(parsed.data.reminders ?? [])
      ]);
    }
  );
}
