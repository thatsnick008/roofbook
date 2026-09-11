"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useLiveQuery } from "dexie-react-hooks";
import { clearAllData, getSyncMeta, onLocalChange } from "@/lib/db";
import { hasPendingLocalChanges, runSync, type SyncOverwrite } from "@/lib/sync/engine";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

// Local IndexedDB is a single device-wide cache — without this, switching accounts on the
// same device would show (and push) the previous account's data until a full sync completed.
export const LOCAL_OWNER_KEY = "pcc-local-owner-id";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error" | "signed-out";

interface SyncContextValue {
  status: SyncStatus;
  lastSyncedAt?: string;
  error?: string;
  sync: (options?: { full?: boolean; overwrite?: SyncOverwrite; onlyIfChanged?: boolean }) => Promise<void>;
}

const SyncContext = React.createContext<SyncContextValue>({
  status: "signed-out",
  sync: async () => {}
});

export const useSync = () => React.useContext(SyncContext);

const AUTO_SYNC_MS = 5 * 60 * 1000;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const meta = useLiveQuery(() => getSyncMeta(), [], undefined);
  const [status, setStatus] = React.useState<SyncStatus>("idle");
  const [failureChoiceOpen, setFailureChoiceOpen] = React.useState(false);
  const [failureReason, setFailureReason] = React.useState<string>();
  const inFlight = React.useRef<Promise<void> | null>(null);

  const sync = React.useCallback(
    async (options: { full?: boolean; overwrite?: SyncOverwrite; onlyIfChanged?: boolean } = {}) => {
      if (sessionStatus !== "authenticated") return;
      // If a sync is already running (e.g. the debounced auto-sync), wait for it instead of
      // skipping — callers that need pending changes flushed (like sign-out) must not return early.
      if (inFlight.current) {
        await inFlight.current;
        return;
      }
      if (options.onlyIfChanged && !(await hasPendingLocalChanges())) return;

      const run = (async () => {
        setStatus("syncing");
        const result = await runSync(options);
        if (result.ok) {
          setFailureChoiceOpen(false);
          setFailureReason(undefined);
          setStatus("synced");
          return;
        }

        const nextStatus = result.error === "offline" ? "offline" : "error";
        setStatus(nextStatus);
        if (nextStatus === "error" && !options.overwrite) {
          setFailureReason(result.error ?? "Cloud sync failed");
          setFailureChoiceOpen(true);
        }
      })();

      inFlight.current = run;
      try {
        await run;
      } finally {
        inFlight.current = null;
      }
    },
    [sessionStatus]
  );

  const overwriteAndSync = React.useCallback(
    async (overwrite: SyncOverwrite) => {
      setFailureChoiceOpen(false);
      await sync({ full: overwrite === "device", overwrite });
    },
    [sync]
  );

  React.useEffect(() => {
    if (sessionStatus !== "authenticated" || !userId) {
      setStatus(sessionStatus === "loading" ? "idle" : "signed-out");
      return;
    }

    let cancelled = false;
    const start = async () => {
      const previousOwner = window.localStorage.getItem(LOCAL_OWNER_KEY);
      if (previousOwner && previousOwner !== userId) {
        // A different account signed in on this device — drop the stale local cache first.
        await clearAllData();
      }
      window.localStorage.setItem(LOCAL_OWNER_KEY, userId);
      if (cancelled) return;
      void sync({ full: previousOwner !== userId, onlyIfChanged: previousOwner === userId });
    };
    void start();

    const interval = setInterval(() => void sync({ onlyIfChanged: true }), AUTO_SYNC_MS);
    const onOnline = () => void sync({ onlyIfChanged: true });
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync({ onlyIfChanged: true });
    };

    // Push any local edit (add/update/delete, in this tab or another) to the server almost immediately,
    // debounced briefly so rapid successive writes (e.g. a form) collapse into one sync call.
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onLocalChange(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => void sync({ onlyIfChanged: true }), 800);
    });

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(debounce);
      unsubscribe();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sessionStatus, userId, sync]);

  const value = React.useMemo(
    () => ({ status, lastSyncedAt: meta?.lastSyncedAt, error: meta?.lastError, sync }),
    [status, meta?.lastSyncedAt, meta?.lastError, sync]
  );

  return (
    <SyncContext.Provider value={value}>
      {children}
      <Modal
        open={failureChoiceOpen}
        onClose={() => setFailureChoiceOpen(false)}
        title="Sync failed"
        description="Choose which copy should win before syncing again."
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {failureReason ?? "Cloud sync failed."} Pick server values to replace this device, or device values to push this device to the server.
          </p>
          <div className="grid gap-2">
            <Button type="button" onClick={() => void overwriteAndSync("server")}>Use server values</Button>
            <Button type="button" variant="secondary" onClick={() => void overwriteAndSync("device")}>Use this device</Button>
          </div>
        </div>
      </Modal>
    </SyncContext.Provider>
  );
}
