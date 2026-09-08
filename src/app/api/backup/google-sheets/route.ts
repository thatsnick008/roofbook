import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/server/db/client";
import { requireUserId } from "@/server/session";
import { backupToGoogleSheets, isGoogleSheetsConfigured } from "@/server/google-sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Cloud sync is not configured" }, { status: 503 });
  }
  if (!isGoogleSheetsConfigured()) {
    return NextResponse.json({ ok: false, error: "Google Sheets backup is not configured" }, { status: 503 });
  }

  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  try {
    const result = await backupToGoogleSheets(userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[backup] google sheets export failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
