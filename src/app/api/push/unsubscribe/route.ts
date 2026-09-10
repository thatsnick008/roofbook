import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { ensureSchema } from "@/server/db/migrate";
import { requireUserId } from "@/server/session";
import { pushSubscriptions } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Cloud sync is not configured" }, { status: 503 });
  }

  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });

  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });

  try {
    await ensureSchema();
    const db = getDb();
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, parsed.data.endpoint)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[push] unsubscribe failed", error);
    return NextResponse.json({ ok: false, error: "Could not remove subscription" }, { status: 500 });
  }
}
