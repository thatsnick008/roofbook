import { GoogleAuth } from "google-auth-library";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "./db/client";
import { registry, type RegistryKey } from "./sync/registry";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

// Documents are excluded — only tabular financial data is mirrored to the recovery sheet.
const EXPORT_TABLES: RegistryKey[] = ["properties", "purchases", "loans", "income", "expenses", "contacts", "reminders"];

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY &&
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  );
}

let cachedAuth: GoogleAuth | undefined;

function getAuth(): GoogleAuth {
  if (!cachedAuth) {
    cachedAuth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        // Env vars store the key with escaped newlines; restore them before signing the JWT.
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n")
      },
      scopes: [SCOPE]
    });
  }
  return cachedAuth;
}

async function getAccessToken(): Promise<string> {
  const client = await getAuth().getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Could not obtain a Google access token");
  return token;
}

function toCell(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function toGrid(rows: Record<string, unknown>[]): (string | number | boolean)[][] {
  if (rows.length === 0) return [["No records"]];
  const headers = Object.keys(rows[0]);
  return [headers, ...rows.map((row) => headers.map((header) => toCell(row[header])))];
}

async function sheetsFetch(path: string, token: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${SHEETS_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) }
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google Sheets API error (${response.status}): ${body.slice(0, 300)}`);
  }
  return response.json();
}

async function ensureSheetTab(spreadsheetId: string, token: string, title: string): Promise<void> {
  const metadata = await sheetsFetch(`/${spreadsheetId}?fields=sheets.properties.title`, token);
  const exists = ((metadata.sheets ?? []) as Array<{ properties?: { title?: string } }>).some(
    (sheet) => sheet.properties?.title === title
  );
  if (exists) return;
  await sheetsFetch(`/${spreadsheetId}:batchUpdate`, token, {
    method: "POST",
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] })
  });
}

async function writeSheetTab(
  spreadsheetId: string,
  token: string,
  title: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  await ensureSheetTab(spreadsheetId, token, title);
  await sheetsFetch(`/${spreadsheetId}/values/${encodeURIComponent(`${title}!A1:ZZ`)}:clear`, token, { method: "POST" });
  await sheetsFetch(`/${spreadsheetId}/values/${encodeURIComponent(`${title}!A1`)}?valueInputOption=RAW`, token, {
    method: "PUT",
    body: JSON.stringify({ values: toGrid(rows) })
  });
}

function titleCase(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export async function backupToGoogleSheets(userId: string): Promise<{ tables: string[]; exportedAt: string }> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not configured");

  const token = await getAccessToken();
  const db = getDb();
  const exportedAt = new Date().toISOString();
  const exported: string[] = [];

  for (const key of EXPORT_TABLES) {
    const table = registry[key].table as any;
    const rows = await db
      .select()
      .from(table)
      .where(and(eq(table.userId, userId), isNull(table.deletedAt)));
    await writeSheetTab(spreadsheetId, token, titleCase(key), rows as Record<string, unknown>[]);
    exported.push(key);
  }

  await writeSheetTab(spreadsheetId, token, "Backup info", [
    { exportedAt, tables: exported.join(", "), source: "Roofbook" }
  ]);

  return { tables: exported, exportedAt };
}
