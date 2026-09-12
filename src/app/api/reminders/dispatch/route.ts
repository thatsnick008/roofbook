import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { properties, reminders, userSettings } from "@/server/db/schema";
import { isPushConfigured, sendPushToUser } from "@/server/push";
import { isEmailConfigured, sendAppEmail } from "@/server/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DueReminder {
  title: string;
  dueDate: string;
  daysAway: number;
  property: string;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }

  const emailEnabled = isEmailConfigured();
  const db = getDb();

  const rows = await db
    .select({
      userId: reminders.userId,
      title: reminders.title,
      dueDate: reminders.dueDate,
      leadDays: reminders.leadDays,
      notifyEmail: reminders.notifyEmail,
      propertyName: properties.name
    })
    .from(reminders)
    .leftJoin(properties, and(eq(properties.userId, reminders.userId), eq(properties.id, reminders.propertyId)))
    .where(and(eq(reminders.completed, false), isNull(reminders.deletedAt)));

  const buckets = new Map<string, { email?: string; items: DueReminder[] }>();

  for (const row of rows) {
    const daysAway = daysUntil(row.dueDate);
    const leadDays = row.leadDays ?? [];
    if (daysAway >= 0 && !leadDays.includes(daysAway)) continue;
    if (daysAway < -30) continue;

    const bucket = buckets.get(row.userId) ?? { email: undefined, items: [] };
    bucket.email ??= row.notifyEmail ?? undefined;
    bucket.items.push({
      title: row.title,
      dueDate: row.dueDate,
      daysAway,
      property: row.propertyName ?? "Portfolio"
    });
    buckets.set(row.userId, bucket);
  }

  if (buckets.size === 0) {
    return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), sent: 0 });
  }

  const preferences = await db.select().from(userSettings);
  const preferenceMap = new Map(preferences.map((row) => [row.userId, row]));
  const pushEnabled = isPushConfigured();
  let sent = 0;
  let pushed = 0;

  for (const [userId, bucket] of buckets) {
    const preference = preferenceMap.get(userId);
    if (preference && !preference.remindersEnabled) continue;

    const to = bucket.email || preference?.ownerEmail;
    if (to && emailEnabled) {
      const result = await sendAppEmail({
        to,
        subject: `${bucket.items.length} property reminder${bucket.items.length === 1 ? "" : "s"} need attention`,
        html: renderEmail(bucket.items)
      });
      if (result.ok) sent += 1;
    }

    if (pushEnabled) {
      const count = bucket.items.length;
      const first = bucket.items[0];
      const body =
        count === 1
          ? `${first.title} — ${first.daysAway < 0 ? `${Math.abs(first.daysAway)}d overdue` : `due in ${first.daysAway}d`}`
          : `${count} reminders need attention`;
      try {
        const delivered = await sendPushToUser(userId, {
          title: "Roofbook reminders",
          body,
          url: "/reminders",
          tag: "roofbook-reminders"
        });
        if (delivered > 0) pushed += 1;
      } catch {
        // Retried on the next scheduled run.
      }
    }
  }

  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), sent, pushed });
}


function daysUntil(dateIso: string): number {
  const target = new Date(`${dateIso.slice(0, 10)}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function renderEmail(items: DueReminder[]): string {
  const rows = items
    .map(
      (item) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${escapeHtml(item.title)}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${escapeHtml(item.property)}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${escapeHtml(item.dueDate)}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${
          item.daysAway < 0 ? `${Math.abs(item.daysAway)}d overdue` : `in ${item.daysAway}d`
        }</td></tr>`
    )
    .join("");

  return `<div style="font-family:Segoe UI,Arial,sans-serif;background:#f6f7fb;padding:24px">
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
        Sent from your Roofbook account. No financial figures are included in this email.
      </p>
    </div>
  </div>`;
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
