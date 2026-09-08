import { and, desc, eq, inArray } from "drizzle-orm";
import { recordRevisions } from "../db/schema";
import type { RegistryKey } from "./registry";

/** Every overwritten or deleted row is snapshotted first, capped at this many versions per record. */
export const MAX_REVISIONS = 5;

export async function snapshotRevision(
  orm: any,
  userId: string,
  tableName: RegistryKey,
  recordId: string,
  data: Record<string, unknown>
): Promise<void> {
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
