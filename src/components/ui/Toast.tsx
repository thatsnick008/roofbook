"use client";

import * as React from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/format";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = React.createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium shadow-pop animate-fade-up",
              toast.tone === "error" && "border-negative/40",
              toast.tone === "success" && "border-positive/40"
            )}
          >
            {toast.tone === "success" ? (
              <CheckCircle2 size={18} className="text-positive" />
            ) : toast.tone === "error" ? (
              <XCircle size={18} className="text-negative" />
            ) : (
              <Info size={18} className="text-brand" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
