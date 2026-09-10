import { NextResponse } from "next/server";
import { requireUserId } from "@/server/session";
import { isPushConfigured, sendPushToUser } from "@/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  if (!isPushConfigured()) {
    return NextResponse.json({ ok: false, error: "Push notifications are not configured" }, { status: 503 });
  }

  const sent = await sendPushToUser(userId, {
    title: "Roofbook",
    body: "Push notifications are set up on this device.",
    tag: "roofbook-test"
  });

  if (sent === 0) return NextResponse.json({ ok: false, error: "No active subscriptions found" }, { status: 404 });
  return NextResponse.json({ ok: true, sent });
}
