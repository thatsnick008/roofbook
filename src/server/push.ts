import webpush from "web-push";
import { eq, or } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "./db/client";
import { ensureSchema } from "./db/migrate";
import { pushSubscriptions } from "./db/schema";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let vapidConfigured = false;

function configureVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@roofbook.app";
  if (!publicKey || !privateKey) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Sends a push notification to every subscribed device for a user, pruning subscriptions the browser has revoked. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!isDatabaseConfigured() || !configureVapid()) return 0;

  await ensureSchema();
  const db = getDb();
  const subscriptions = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  if (subscriptions.length === 0) return 0;

  const stale: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          JSON.stringify(payload)
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) stale.push(subscription.endpoint);
      }
    })
  );

  if (stale.length > 0) {
    await db.delete(pushSubscriptions).where(or(...stale.map((endpoint) => eq(pushSubscriptions.endpoint, endpoint))));
  }

  return sent;
}
