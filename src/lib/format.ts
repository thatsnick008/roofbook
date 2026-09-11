import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CurrencyCode } from "./types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function money(value: number, precise = false, currency: CurrencyCode = "AUD"): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: precise ? 2 : 0,
    maximumFractionDigits: precise ? 2 : 0
  }).format(value);
}

function currencySymbol(currency: CurrencyCode): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value ?? "$";
}

export function compactMoney(value: number, currency: CurrencyCode = "AUD"): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const prefix = `${value < 0 ? "-" : ""}${currencySymbol(currency)}`;
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${prefix}${(abs / 1_000).toFixed(1)}k`;
  return money(value, false, currency);
}

/** Indian numbering: abbreviates large amounts as Lac (1,00,000) / Cr (1,00,00,000) instead of full digits. */
export function compactMoneyLacs(value: number, currency: CurrencyCode = "AUD"): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const prefix = `${value < 0 ? "-" : ""}${currencySymbol(currency)}`;
  if (abs >= 1_00_00_000) return `${prefix}${(abs / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `${prefix}${(abs / 1_00_000).toFixed(2)} L`;
  return money(value, false, currency);
}

type MoneyPeriod = "week" | "fortnight" | "month" | "year";

const periodSuffix: Record<MoneyPeriod, string> = {
  week: "wk",
  fortnight: "fortnight",
  month: "mo",
  year: "yr"
};

export function moneyPerPeriod(value: number, period: MoneyPeriod, precise = false, currency: CurrencyCode = "AUD"): string {
  const formatted = money(value, precise, currency);
  return formatted === "—" ? formatted : `${formatted}/${periodSuffix[period]}`;
}

export function compactMoneyPerPeriod(value: number, period: MoneyPeriod, currency: CurrencyCode = "AUD"): string {
  const formatted = compactMoney(value, currency);
  return formatted === "—" ? formatted : `${formatted}/${periodSuffix[period]}`;
}

export function percent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatShortDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(date);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dateIso: string): number {
  const target = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function titleise(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
