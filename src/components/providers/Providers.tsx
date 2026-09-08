"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { SyncProvider } from "./SyncProvider";
import { CurrencyProvider } from "./CurrencyProvider";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    let refreshing = false;
    let checkForUpdate: (() => void) | undefined;

    const activateWaitingWorker = (worker?: ServiceWorker | null) => {
      worker?.postMessage({ type: "SKIP_WAITING" });
    };

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.update().catch(() => undefined);
        activateWaitingWorker(registration.waiting);

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) activateWaitingWorker(worker);
          });
        });

        checkForUpdate = () => {
          if (document.visibilityState === "visible") registration.update().catch(() => undefined);
        };
        document.addEventListener("visibilitychange", checkForUpdate);
        window.addEventListener("focus", checkForUpdate);
      })
      .catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (!checkForUpdate) return;
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("focus", checkForUpdate);
    };
  }, []);

  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ThemeProvider>
        <ToastProvider>
          <SyncProvider>
            <CurrencyProvider>{children}</CurrencyProvider>
          </SyncProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
