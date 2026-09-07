"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSyncMeta } from "@/lib/db";
import { runSync, type SyncOverwrite } from "@/lib/sync/engine";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error" | "signed-out";

interface SyncContextValue {
  status: SyncStatus;
  lastSyncedAt?: string;
  error?: string;
  sync: (options?: { full?: boolean; overwrite?: SyncOverwrite }) => Promise<void>;
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
  const [failureChoiceOpen, setFailureChoiceOpen] = React.useState(false);
  const [failureReason, setFailureReason] = React.useState<string>();
  const running = React.useRef(false);

  const sync = React.useCallback(
    async (options: { full?: boolean; overwrite?: SyncOverwrite } = {}) => {
      if (sessionStatus !== "authenticated" || running.current) return;
      running.current = true;
      setStatus("syncing");
      const result = await runSync(options);
      running.current = false;
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
