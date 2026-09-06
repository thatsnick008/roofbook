"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSyncMeta } from "@/lib/db";
import { runSync } from "@/lib/sync/engine";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error" | "signed-out";

interface SyncContextValue {
  status: SyncStatus;
  lastSyncedAt?: string;
  error?: string;
  sync: (options?: { full?: boolean }) => Promise<void>;
}

const SyncContext = React.createContext<SyncContextValue>({
  status: "signed-out",
  sync: async () => {}
});

export const useSync = () => React.useContext(SyncContext);

const AUTO_SYNC_MS = 5 * 60 * 1000;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { status: sessionStatus } = useSession();
  const meta = useLiveQuery(() => getSyncMeta(), [], undefined);
  const [status, setStatus] = React.useState<SyncStatus>("idle");
  const running = React.useRef(false);

  const sync = React.useCallback(
    async (options: { full?: boolean } = {}) => {
      if (sessionStatus !== "authenticated" || running.current) return;
      running.current = true;
      setStatus("syncing");
      const result = await runSync(options);
      running.current = false;
      setStatus(result.ok ? "synced" : result.error === "offline" ? "offline" : "error");
    },
    [sessionStatus]
  );

  React.useEffect(() => {
    if (sessionStatus !== "authenticated") {
      setStatus(sessionStatus === "loading" ? "idle" : "signed-out");
      return;
    }

    void sync();
    const interval = setInterval(() => void sync(), AUTO_SYNC_MS);
    const onOnline = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sessionStatus, sync]);

  const value = React.useMemo(
    () => ({ status, lastSyncedAt: meta?.lastSyncedAt, error: meta?.lastError, sync }),
    [status, meta?.lastSyncedAt, meta?.lastError, sync]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
