import { applyWithoutStamping, db, getSettings, getSyncMeta, saveSyncMeta, SYNC_TABLES } from "../db";
import type { StoredDocument } from "../types";

export interface SyncResult {
  ok: boolean;
  pushed: number;
  pulled: number;
  error?: string;
}

export type SyncOverwrite = "server" | "device";

type Row = Record<string, unknown> & { id: string; updatedAt?: string; createdAt?: string };

type SyncPayload = {
  ok: boolean;
  serverTime: string;
  changes: Record<string, Row[]>;
  deletes: { table: string; id: string }[];
  error?: string;
};

const changedSince = (row: Row, since?: string): boolean =>
  !since || String(row.updatedAt ?? row.createdAt ?? "") > since;

export async function runSync(options: { full?: boolean; overwrite?: SyncOverwrite } = {}): Promise<SyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, pushed: 0, pulled: 0, error: "offline" };
  }

  if (options.overwrite === "server") {
    return await restoreFromServer("Using server values");
  }

  const meta = await getSyncMeta();
  const since = options.full || options.overwrite === "device" ? undefined : meta.lastSyncedAt;

  const changes: Record<string, Row[]> = {};
  let pushed = 0;

  for (const name of SYNC_TABLES) {
    const rows = (await db.table(name).toArray()) as Row[];
    const outgoing = rows.filter((row) => changedSince(row, since)).map((row) => serialise(name, row));
    if (outgoing.length) {
      changes[name] = outgoing;
      pushed += outgoing.length;
    }
  }

  const tombstones = await db.tombstones.toArray();
  const settings = await getSettings();

  let payload: SyncPayload;

  try {
    const { response, payload: syncPayload } = await requestSync({
      since,
      changes,
      deletes: tombstones.map((tombstone) => ({
        table: tombstone.table,
        id: tombstone.id,
        deletedAt: tombstone.deletedAt
      })),
      settings: {
        ownerName: settings.ownerName,
        ownerEmail: settings.ownerEmail,
        remindersEnabled: settings.remindersEnabled
      }
    });

    payload = syncPayload;
    if (!response.ok || !payload.ok) {
      const error = payload?.error ?? `Sync failed (${response.status})`;
      await saveSyncMeta({ lastError: error });
      return { ok: false, pushed: 0, pulled: 0, error };
    }
  } catch {
    await saveSyncMeta({ lastError: "Network unavailable" });
    return { ok: false, pushed: 0, pulled: 0, error: "Network unavailable" };
  }

  const pulled = await applyServerPayload(payload);

  if (tombstones.length) {
    await db.tombstones.bulkDelete(tombstones.map((tombstone) => tombstone.id));
  }

  await uploadPendingDocuments();
  await saveSyncMeta({ lastSyncedAt: payload.serverTime, lastError: undefined });

  return { ok: true, pushed, pulled };
}

async function requestSync(body: Record<string, unknown>): Promise<{ response: Response; payload: SyncPayload }> {
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({
    ok: false,
    serverTime: "",
    changes: {},
    deletes: [],
    error: `Sync failed (${response.status})`
  }));

  return { response, payload };
}

async function restoreFromServer(originalError: string): Promise<SyncResult> {
  try {
    const { response, payload } = await requestSync({ changes: {}, deletes: [] });
    if (!response.ok || !payload.ok) {
      const error = `${originalError}. Server override failed: ${payload?.error ?? `Sync failed (${response.status})`}`;
      await saveSyncMeta({ lastError: error });
      return { ok: false, pushed: 0, pulled: 0, error };
    }

    const pulled = await applyServerPayload(payload, { authoritative: true });
    await saveSyncMeta({ lastSyncedAt: payload.serverTime, lastError: undefined });
    return { ok: true, pushed: 0, pulled };
  } catch {
    const error = `${originalError}. Server override failed: Network unavailable`;
    await saveSyncMeta({ lastError: error });
    return { ok: false, pushed: 0, pulled: 0, error };
  }
}

async function applyServerPayload(payload: SyncPayload, options: { authoritative?: boolean } = {}): Promise<number> {
  const incoming: [string, Row[]][] = [];
  let pulled = 0;

  for (const [name, rows] of Object.entries(payload.changes ?? {})) {
    if (!SYNC_TABLES.includes(name as (typeof SYNC_TABLES)[number])) continue;
    const merged = name === "documents" ? await mergeDocuments(rows) : rows;
    incoming.push([name, merged]);
    pulled += merged.length;
  }

  await applyWithoutStamping(async () => {
    if (options.authoritative) {
      for (const name of SYNC_TABLES) {
        await db.table(name).clear();
      }
      await db.tombstones.clear();
    }

    for (const [name, rows] of incoming) {
      await db.table(name).bulkPut(rows);
    }

    if (!options.authoritative) {
      for (const removal of payload.deletes ?? []) {
        if (!SYNC_TABLES.includes(removal.table as (typeof SYNC_TABLES)[number])) continue;
        await db.table(removal.table).delete(removal.id);
      }
    }
  });

  return pulled;
}

/** Document bytes travel separately from the metadata row. */
async function uploadPendingDocuments(): Promise<void> {
  const pending = (await db.documents.toArray()).filter((document) => document.blob && !document.remote);

  for (const document of pending) {
    if (!document.blob || document.blob.size > 4 * 1024 * 1024) continue;
    const form = new FormData();
    form.append("file", document.blob, document.name);
    form.append("id", document.id);
    form.append("category", document.category);
    if (document.propertyId) form.append("propertyId", document.propertyId);

    try {
      const response = await fetch("/api/documents", { method: "POST", body: form });
      if (!response.ok) continue;
      await applyWithoutStamping(async () => {
        await db.documents.update(document.id, { remote: true });
      });
    } catch {
      // Retried on the next sync pass.
    }
  }
}

async function mergeDocuments(rows: Row[]): Promise<Row[]> {
  const merged: Row[] = [];
  for (const row of rows) {
    const local = (await db.documents.get(String(row.id))) as StoredDocument | undefined;
    merged.push({ ...row, blob: local?.blob, remote: true } as Row);
  }
  return merged;
}

function serialise(name: string, row: Row): Row {
  const value: Row = { ...row, updatedAt: String(row.updatedAt ?? row.createdAt ?? new Date().toISOString()) };
  if (name === "documents") {
    delete value.blob;
    delete value.remote;
  }
  return value;
}
