import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { hash } from "bcryptjs";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { passwordResetTokens, users } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ token: z.string().min(32).max(100), password: z.string().min(8).max(200) });

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Password reset is unavailable." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Use a password with at least 8 characters." }, { status: 400 });

  const db = getDb();
  const [reset] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.token, parsed.data.token), gt(passwordResetTokens.expiresAt, new Date())));
  if (!reset) return NextResponse.json({ ok: false, error: "This reset link is invalid or has expired." }, { status: 400 });

  await db.update(users).set({ passwordHash: await hash(parsed.data.password, 10) }).where(eq(users.id, reset.userId));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, reset.token));
  return NextResponse.json({ ok: true });
}