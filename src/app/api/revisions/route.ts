import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { ensureSchema } from "@/server/db/migrate";
import { requireUserId } from "@/server/session";
import { recordRevisions } from "@/server/db/schema";
import { registry, registryKeys, type RegistryKey } from "@/server/sync/registry";
import { snapshotRevision } from "@/server/sync/revisions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 100;

const restoreSchema = z.object({
  table: z.enum(registryKeys as [RegistryKey, ...RegistryKey[]]),
  recordId: z.string().min(1).max(64),
  version: z.number().int().min(1)
});

/** Human-readable handle for a snapshot so the settings list is meaningful. */
function labelOf(data: Record<string, unknown>): string {
  return String(data.name ?? data.title ?? data.bank ?? data.category ?? data.id ?? "Record");
}

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Cloud sync is not configured" }, { status: 503 });
  }

  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });

  try {
    await ensureSchema();
    const db = getDb();
    const rows = await db
      .select()
      .from(recordRevisions)
      .where(eq(recordRevisions.userId, userId))
      .orderBy(desc(recordRevisions.createdAt))
      .limit(HISTORY_LIMIT);

    return NextResponse.json({
      ok: true,
      revisions: rows.map((row) => ({
        table: row.tableName,
        recordId: row.recordId,
        version: row.version,
        label: labelOf(row.data),
        createdAt: row.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error("[revisions] list failed", error);
    return NextResponse.json({ ok: false, error: "Could not load version history" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Cloud sync is not configured" }, { status: 503 });
  }

  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });

  const parsed = restoreSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });

  const { table: key, recordId, version } = parsed.data;

  try {
    await ensureSchema();
    const orm = getDb() as any;

    const [revision] = await orm
      .select()
      .from(recordRevisions)
      .where(
        and(
          eq(recordRevisions.userId, userId),
          eq(recordRevisions.tableName, key),
          eq(recordRevisions.recordId, recordId),
          eq(recordRevisions.version, version)
        )
      );

    if (!revision) return NextResponse.json({ ok: false, error: "Version not found" }, { status: 404 });

    const table = registry[key].table as any;
    const serverTime = new Date();
    // Bumping updatedAt is what makes every signed-in device pull the restored row on its next sync.
    const values = { ...revision.data, userId, id: recordId, updatedAt: serverTime, deletedAt: null };

    const [existing] = await orm.select().from(table).where(and(eq(table.userId, userId), eq(table.id, recordId)));

    if (existing) {
      // Snapshot first so restoring the wrong version is itself reversible.
      await snapshotRevision(orm, userId, key, recordId, existing);
      await orm.update(table).set(values).where(and(eq(table.userId, userId), eq(table.id, recordId)));
    } else {
      await orm.insert(table).values(values);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[revisions] restore failed", error);
    return NextResponse.json({ ok: false, error: "Could not restore that version" }, { status: 500 });
  }
}
