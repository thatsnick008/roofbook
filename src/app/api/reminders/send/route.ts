import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/server/session";
import { sendAppEmail } from "@/server/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  to: z.string().email(),
  reminders: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        dueDate: z.string().min(8).max(10),
        daysAway: z.number().int().min(-3650).max(3650),
        property: z.string().max(120).optional()
      })
    )
    .min(1)
    .max(50)
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Email service not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const { to, reminders } = parsed.data;
  const rows = reminders
    .map(
      (reminder) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${escapeHtml(reminder.title)}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${escapeHtml(reminder.property ?? "Portfolio")}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${escapeHtml(reminder.dueDate)}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${reminder.daysAway < 0 ? `${Math.abs(reminder.daysAway)}d overdue` : `in ${reminder.daysAway}d`}</td></tr>`
    )
    .join("");

  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;background:#f6f7fb;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#0f172a;color:#fff;padding:20px 24px">
        <h1 style="margin:0;font-size:18px">Roofbook</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:.8">Upcoming property actions</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr style="background:#f1f5f9;text-align:left">
          <th style="padding:10px 12px">Reminder</th><th style="padding:10px 12px">Property</th>
          <th style="padding:10px 12px;text-align:right">Due</th><th style="padding:10px 12px;text-align:right">When</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="padding:16px 24px;color:#64748b;font-size:12px;margin:0">
        Sent from your Roofbook account. No financial data leaves your device.
      </p>
    </div>
  </div>`;

  const result = await sendAppEmail({
    to,
    subject: `${reminders.length} property reminder${reminders.length === 1 ? "" : "s"} need attention`,
    html
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "Delivery failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sent: reminders.length });
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}
