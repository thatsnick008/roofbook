"use client";

import * as React from "react";
import type { CurrencyCode } from "@/lib/types";

export type CurrencyFilter = CurrencyCode | "all";

/** Session-scoped so the choice never leaks into stored settings or another tab. */
const STORAGE_KEY = "pcc-currency-filter";

interface CurrencyContextValue {
  currency: CurrencyFilter;
  setCurrency: (value: CurrencyFilter) => void;
}

const CurrencyContext = React.createContext<CurrencyContextValue>({
  currency: "all",
  setCurrency: () => {}
});

export const useCurrencyFilter = () => React.useContext(CurrencyContext);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = React.useState<CurrencyFilter>("all");

  React.useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY) as CurrencyFilter | null;
    if (stored) setCurrencyState(stored);
  }, []);

  const setCurrency = React.useCallback((value: CurrencyFilter) => {
    setCurrencyState(value);
    window.sessionStorage.setItem(STORAGE_KEY, value);
  }, []);

  const value = React.useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
