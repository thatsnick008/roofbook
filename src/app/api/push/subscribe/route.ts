import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { ensureSchema } from "@/server/db/migrate";
import { requireUserId } from "@/server/session";
import { pushSubscriptions } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Cloud sync is not configured" }, { status: 503 });
  }

  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid subscription" }, { status: 400 });

  try {
    await ensureSchema();
    const db = getDb();
    const { endpoint, keys } = parsed.data;

    await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
    await db.insert(pushSubscriptions).values({
      id: crypto.randomUUID(),
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[push] subscribe failed", error);
    return NextResponse.json({ ok: false, error: "Could not save subscription" }, { status: 500 });
  }
}
