"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { SyncProvider } from "./SyncProvider";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ThemeProvider>
        <ToastProvider>
          <SyncProvider>{children}</SyncProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
