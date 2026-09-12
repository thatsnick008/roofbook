import { Resend } from "resend";
import nodemailer from "nodemailer";

const SANDBOX_FROM = "Roofbook <onboarding@resend.dev>";

function isUnverifiedDomainError(message?: string): boolean {
  return Boolean(message && /domain/i.test(message) && /verif/i.test(message));
}

function getSmtpTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD));
}

/**
 * Sends via Gmail SMTP if GMAIL_USER/GMAIL_APP_PASSWORD are set (no domain verification needed,
 * but the `from` address is always the Gmail account itself), otherwise via Resend. The Resend SDK
 * resolves with `{ data, error }` instead of throwing for API-level failures — check `error` explicitly.
 * If the configured REMINDER_FROM_EMAIL domain isn't verified in Resend, falls back once to the
 * onboarding@resend.dev sandbox address (which can only deliver to the Resend account owner's own inbox).
 */
export async function sendAppEmail(options: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
  const smtp = getSmtpTransport();
  if (smtp) {
    try {
      await smtp.sendMail({ ...options, from: `Roofbook <${process.env.GMAIL_USER}>` });
      return { ok: true };
    } catch (error) {
      console.error("[email] Gmail SMTP send failed:", error);
      return { ok: false, error: error instanceof Error ? error.message : "Delivery failed" };
    }
  }

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
