import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { requireUserId } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200).optional().or(z.literal(""))
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId || !isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  const [user] = await getDb().select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId));
  return user ? NextResponse.json({ ok: true, user }) : NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
}

export async function PUT(request: Request) {
  const userId = await requireUserId();
  if (!userId || !isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter a name, valid email, and an optional password of 8+ characters." }, { status: 400 });

  const duplicate = await getDb().select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email));
  if (duplicate.some((user) => user.id !== userId)) return NextResponse.json({ ok: false, error: "That email is already in use." }, { status: 409 });

  await getDb()
    .update(users)
    .set({
      name: parsed.data.name,
      email: parsed.data.email,
      ...(parsed.data.password ? { passwordHash: await hash(parsed.data.password, 10) } : {})
    })
    .where(eq(users.id, userId));
  return NextResponse.json({ ok: true, user: { name: parsed.data.name, email: parsed.data.email } });
}