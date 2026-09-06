import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { requireUserId } from "@/server/session";
import { documents } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Route handler bodies are capped by the platform; larger files stay local-only.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isDatabaseConfigured() || !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, error: "Cloud storage is not configured" }, { status: 503 });
  }

  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const id = String(form.get("id") ?? "");

  if (!(file instanceof File) || !id) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: "File exceeds 4 MB upload limit" }, { status: 413 });
  }

  const propertyId = form.get("propertyId") ? String(form.get("propertyId")) : null;
  const category = String(form.get("category") ?? "other").slice(0, 40);
  const stamp = new Date();

  const blob = await put(`${userId}/${id}-${sanitise(file.name)}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream"
  });

  const db = getDb();
  const values = {
    id,
    userId,
    propertyId,
    name: file.name.slice(0, 240),
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    tags: [],
    category,
    blobUrl: blob.url,
    uploadedAt: stamp.toISOString(),
    updatedAt: stamp,
    deletedAt: null
  };

  const existing = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.userId, userId), eq(documents.id, id)));

  if (existing.length) {
    await db.update(documents).set(values).where(and(eq(documents.userId, userId), eq(documents.id, id)));
  } else {
    await db.insert(documents).values(values);
  }

  return NextResponse.json({ ok: true, id, uploadedAt: values.uploadedAt });
}

function sanitise(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
}
