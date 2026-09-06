import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { users } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registerSchema = z.object({
  name: z.string().trim().max(160).optional(),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200)
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "No database is connected yet. Ask whoever set up hosting to add DATABASE_URL." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email and a password with at least 8 characters." },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;
  const db = getDb();

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "An account with this email already exists. Try signing in instead." },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 10);
  await db.insert(users).values({
    id: crypto.randomUUID(),
    email,
    passwordHash,
    name: name || email
  });

  return NextResponse.json({ ok: true });
}
