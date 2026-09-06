"use client";

import * as React from "react";
import { AlertTriangle, Check, CloudOff, RefreshCw } from "lucide-react";
import { useSync } from "@/components/providers/SyncProvider";
import { cn } from "@/lib/format";

export function SyncIndicator() {
  const { status, lastSyncedAt, sync } = useSync();

  const label =
    status === "syncing"
      ? "Syncing…"
      : status === "offline"
        ? "Offline"
        : status === "error"
          ? "Sync failed"
          : lastSyncedAt
            ? `Synced ${relative(lastSyncedAt)}`
            : "Not synced";

  const tone =
    status === "error" ? "text-negative" : status === "offline" ? "text-warning" : status === "syncing" ? "text-brand" : "text-muted";

  return (
    <button
      onClick={() => void sync()}
      title={label}
      className={cn(
        "flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-medium transition hover:border-brand/40",
        tone
      )}
    >
      {status === "syncing" ? (
        <RefreshCw size={14} className="animate-spin" />
      ) : status === "offline" ? (
        <CloudOff size={14} />
      ) : status === "error" ? (
        <AlertTriangle size={14} />
      ) : (
        <Check size={14} />
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function relative(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86_400)}d ago`;
}
