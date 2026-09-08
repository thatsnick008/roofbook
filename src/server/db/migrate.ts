import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "./client";

let applied: Promise<void> | undefined;

/**
 * Applies the checked-in migrations on first use. Every statement is idempotent
 * (IF NOT EXISTS), so a deployment whose database is behind self-heals instead of
 * failing every sync request with a missing-column error.
 */
export function ensureSchema(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!applied) {
    applied = runMigrations().catch((error) => {
      applied = undefined;
      throw error;
    });
  }
  return applied;
}

async function runMigrations(): Promise<void> {
  const dir = path.join(process.cwd(), "drizzle");
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
  const db = getDb();

  for (const file of files) {
    const contents = await readFile(path.join(dir, file), "utf8");
    for (const statement of splitStatements(contents)) {
      await db.execute(sql.raw(statement));
    }
  }
}

/** Neon's HTTP driver rejects multi-statement queries, so each file is sent one statement at a time. */
function splitStatements(contents: string): string[] {
  return contents
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}
