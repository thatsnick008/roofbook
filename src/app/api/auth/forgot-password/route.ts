import { NextResponse } from "next/server";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { passwordResetTokens, users } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

export async function POST(request: Request) {
  const generic = { ok: true, message: "If an account exists for that email, a reset link has been sent." };
  if (!isDatabaseConfigured() || !process.env.RESEND_API_KEY) return NextResponse.json(generic);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email));
  if (!user) return NextResponse.json(generic);

  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  await db.insert(passwordResetTokens).values({
    token,
    userId: user.id,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000)
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
  const resetUrl = `${baseUrl}/?reset=${token}`;
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.REMINDER_FROM_EMAIL ?? "Roofbook <onboarding@resend.dev>",
      to: user.email,
      subject: "Reset your Roofbook password",
      html: `<p>We received a request to reset your Roofbook password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes.</p>`
    });
  } catch {
    return NextResponse.json(generic);
  }

  return NextResponse.json(generic);
}