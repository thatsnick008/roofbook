import { Resend } from "resend";

const SANDBOX_FROM = "Roofbook <onboarding@resend.dev>";

function isUnverifiedDomainError(message?: string): boolean {
  return Boolean(message && /domain/i.test(message) && /verif/i.test(message));
}

/**
 * Sends via Resend, logging any API-level error (the SDK resolves with `{ error }` instead of throwing).
 * If the configured REMINDER_FROM_EMAIL domain isn't verified in Resend, falls back once to the
 * onboarding@resend.dev sandbox address so at least the account owner keeps receiving mail while
 * the real domain is being verified.
 */
export async function sendAppEmail(options: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Email service not configured" };

  const resend = new Resend(apiKey);
  const configuredFrom = process.env.REMINDER_FROM_EMAIL ?? SANDBOX_FROM;

  const { error } = await resend.emails.send({ ...options, from: configuredFrom });
  if (!error) return { ok: true };

  console.error("[email] Resend rejected the email:", error);

  if (configuredFrom !== SANDBOX_FROM && isUnverifiedDomainError(error.message)) {
    const fallback = await resend.emails.send({ ...options, from: SANDBOX_FROM });
    if (!fallback.error) return { ok: true };
    console.error("[email] Sandbox fallback also failed:", fallback.error);
    return { ok: false, error: fallback.error.message };
  }

  return { ok: false, error: error.message };
}
