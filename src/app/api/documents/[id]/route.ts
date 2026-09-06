import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { requireUserId } from "@/server/session";
import { documents } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streams the blob through the API so the underlying public Blob URL is never exposed. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const guard = await authorise();
  if ("response" in guard) return guard.response;

  const db = getDb();
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.userId, guard.userId), eq(documents.id, params.id)));

  if (!row?.blobUrl || row.deletedAt) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const upstream = await fetch(row.blobUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(row.name)}"`,
      "Cache-Control": "private, no-store"
    }
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const guard = await authorise();
  if ("response" in guard) return guard.response;

  const db = getDb();
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.userId, guard.userId), eq(documents.id, params.id)));

  if (row?.blobUrl) {
    await del(row.blobUrl).catch(() => undefined);
  }

  const stamp = new Date();
  await db
    .update(documents)
    .set({ deletedAt: stamp, updatedAt: stamp, blobUrl: null })
    .where(and(eq(documents.userId, guard.userId), eq(documents.id, params.id)));

  return NextResponse.json({ ok: true });
}

async function authorise(): Promise<{ userId: string } | { response: NextResponse }> {
  if (!isDatabaseConfigured()) {
    return { response: NextResponse.json({ ok: false, error: "Cloud storage is not configured" }, { status: 503 }) };
  }
  const userId = await requireUserId();
  if (!userId) {
    return { response: NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 }) };
  }
  return { userId };
}
