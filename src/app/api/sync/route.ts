import { NextResponse } from "next/server";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { requireUserId } from "@/server/session";
import { recordRevisions, userSettings } from "@/server/db/schema";
import { registry, registryKeys, syncRequestSchema, type RegistryKey } from "@/server/sync/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every overwritten or deleted row is snapshotted first, capped at this many versions per record. */
const MAX_REVISIONS = 5;

type Row = Record<string, any>;

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Cloud sync is not configured" }, { status: 503 });
  }

  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = syncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  try {
    return await syncChanges(parsed.data, userId);
  } catch (error) {
    console.error("[sync] request failed", error);
    return NextResponse.json(
      { ok: false, error: "Cloud sync failed. Apply the latest database migrations and try again." },
      { status: 500 }
    );
  }
}

async function syncChanges(parsed: any, userId: string) {
  const db = getDb();
  const orm = db as any;
  const { since, changes, deletes, settings } = parsed;
  const serverTime = new Date();

  if (settings) {
    const values = { userId, ...settings, updatedAt: serverTime };
    const existing = await db.select({ userId: userSettings.userId }).from(userSettings).where(eq(userSettings.userId, userId));
    if (existing.length) {
      await db.update(userSettings).set(values).where(eq(userSettings.userId, userId));
    } else {
      await db.insert(userSettings).values(values);
    }
  }

  for (const key of registryKeys) {
    const incoming = changes[key] as Row[] | undefined;
    if (incoming?.length) await pushRows(orm, userId, key, incoming, serverTime);
  }

  for (const removal of deletes) {
    if (!registryKeys.includes(removal.table as RegistryKey)) continue;
    const key = removal.table as RegistryKey;
    const table = registry[key].table as any;
    const [existingRow] = await orm.select().from(table).where(and(eq(table.userId, userId), eq(table.id, removal.id)));
    if (existingRow) await snapshotRevision(orm, userId, key, removal.id, existingRow);
    await orm
      .update(table)
      .set({ deletedAt: serverTime, updatedAt: serverTime })
      .where(and(eq(table.userId, userId), eq(table.id, removal.id)));
  }

  const sinceDate = since ? new Date(since) : new Date(0);
  const pulledChanges: Record<string, Row[]> = {};
  const pulledDeletes: { table: string; id: string }[] = [];

  for (const key of registryKeys) {
    const table = registry[key].table as any;
    const rows: Row[] = await orm
      .select()
      .from(table)
      .where(and(eq(table.userId, userId), gt(table.updatedAt, sinceDate)));

    const alive: Row[] = [];
    rows.forEach((row) => {
      if (row.deletedAt) {
        pulledDeletes.push({ table: key, id: String(row.id) });
      } else {
        alive.push(toClientRow(row));
      }
    });
    if (alive.length) pulledChanges[key] = alive;
  }

  return NextResponse.json({
    ok: true,
    serverTime: serverTime.toISOString(),
    changes: pulledChanges,
    deletes: pulledDeletes
  });
}

async function pushRows(orm: any, userId: string, key: RegistryKey, incoming: Row[], serverTime: Date): Promise<void> {
  const { schema } = registry[key];
  const table = registry[key].table as any;

  const valid = incoming
    .map((row) => schema.safeParse(row))
    .filter((result) => result.success)
    .map((result) => (result as { data: Row }).data);

  if (valid.length === 0) return;

  const ids = valid.map((row) => String(row.id));
  const existing: Row[] = await orm
    .select()
    .from(table)
    .where(and(eq(table.userId, userId), inArray(table.id, ids)));

  const existingMap = new Map(existing.map((row) => [String(row.id), row]));
  const inserts: Row[] = [];

  // The server clock is authoritative: incoming rows always win, but the row they replace
  // is snapshotted first so a stale or conflicting client push never loses data permanently.
  for (const row of valid) {
    const values = { ...row, userId, updatedAt: serverTime, deletedAt: null };
    const existingRow = existingMap.get(String(row.id));

    if (!existingRow) {
      inserts.push(values);
    } else {
      await snapshotRevision(orm, userId, key, String(row.id), existingRow);
      await orm
        .update(table)
        .set(values)
        .where(and(eq(table.userId, userId), eq(table.id, String(row.id))));
    }
  }

  if (inserts.length) {
    await orm.insert(table).values(inserts);
  }
}

async function snapshotRevision(orm: any, userId: string, tableName: RegistryKey, recordId: string, data: Row): Promise<void> {
  const [latest] = await orm
    .select({ version: recordRevisions.version })
    .from(recordRevisions)
    .where(
      and(
        eq(recordRevisions.userId, userId),
        eq(recordRevisions.tableName, tableName),
        eq(recordRevisions.recordId, recordId)
      )
    )
    .orderBy(desc(recordRevisions.version))
    .limit(1);

  await orm.insert(recordRevisions).values({
    id: crypto.randomUUID(),
    userId,
    tableName,
    recordId,
    version: (latest?.version ?? 0) + 1,
    data
  });

  const stale = await orm
    .select({ id: recordRevisions.id })
    .from(recordRevisions)
    .where(
      and(
        eq(recordRevisions.userId, userId),
        eq(recordRevisions.tableName, tableName),
        eq(recordRevisions.recordId, recordId)
      )
    )
    .orderBy(desc(recordRevisions.version))
    .offset(MAX_REVISIONS);

  if (stale.length) {
    await orm.delete(recordRevisions).where(
      inArray(
        recordRevisions.id,
        stale.map((row: { id: string }) => row.id)
      )
    );
  }
}

function toClientRow(row: Row): Row {
  const { userId: _userId, deletedAt: _deletedAt, blobUrl: _blobUrl, ...rest } = row;
  return {
    ...rest,
    updatedAt: rest.updatedAt instanceof Date ? rest.updatedAt.toISOString() : String(rest.updatedAt)
  };
}
