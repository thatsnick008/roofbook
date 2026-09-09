"use client";

import * as React from "react";
import { cn, compactMoney, percent } from "@/lib/format";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { CurrencyCode } from "@/lib/types";

export function StatCard({
  label,
  value,
  helper,
  delta,
  icon,
  tone = "brand",
  className
}: {
  label: string;
  value: string;
  helper?: string;
  delta?: number;
  icon?: React.ReactNode;
  tone?: "brand" | "positive" | "negative" | "warning";
  className?: string;
}) {
  const toneClass = {
    brand: "from-brand/20 to-transparent text-brand",
    positive: "from-positive/20 to-transparent text-positive",
    negative: "from-negative/20 to-transparent text-negative",
    warning: "from-warning/20 to-transparent text-warning"
  }[tone];

  return (
    <div className={cn("card relative flex h-full flex-col overflow-hidden p-5 animate-fade-up", className)}>
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70", toneClass)} />
      <div className="relative flex flex-1 flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 text-xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-2xl">{value}</p>
          </div>
          {icon ? <div className={cn("rounded-xl bg-surface/70 p-2.5", toneClass)}>{icon}</div> : null}
        </div>
        <div>
          {helper ? <p className="text-xs text-muted">{helper}</p> : null}
          {typeof delta === "number" && Number.isFinite(delta) ? (
            <p
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-semibold",
                delta >= 0 ? "text-positive" : "text-negative"
              )}
            >
              {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {percent(Math.abs(delta), 1)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MiniStat({ label, value, currency = "AUD" }: { label: string; value: number | string; currency?: CurrencyCode }) {
  return (
    <div className="rounded-xl border border-border bg-bg/50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{typeof value === "number" ? compactMoney(value, currency) : value}</p>
    </div>
  );
}
