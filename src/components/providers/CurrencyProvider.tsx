"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { CurrencyCode } from "@/lib/types";

export const DEFAULT_CURRENCY: CurrencyCode = "AUD";

/** Session-scoped so the choice never leaks into stored settings or another tab. */
const STORAGE_KEY = "pcc-currency-filter";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (value: CurrencyCode) => void;
  available: CurrencyCode[];
}

const CurrencyContext = React.createContext<CurrencyContextValue>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  available: []
});

export const useCurrencyFilter = () => React.useContext(CurrencyContext);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const properties = useLiveQuery(() => db.properties.toArray(), [], undefined);
  const [currency, setCurrencyState] = React.useState<CurrencyCode>(DEFAULT_CURRENCY);
  const initialised = React.useRef(false);

  const available = React.useMemo(
    () => [...new Set((properties ?? []).map((property) => property.currency ?? DEFAULT_CURRENCY))].sort(),
    [properties]
  );

  React.useEffect(() => {
    if (!properties || available.length === 0) return;
    setCurrencyState((current) => {
      if (initialised.current) return available.includes(current) ? current : available[0];
      initialised.current = true;
      const stored = window.sessionStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      return stored && available.includes(stored) ? stored : available[0];
    });
  }, [available, properties]);

  const setCurrency = React.useCallback((value: CurrencyCode) => {
    initialised.current = true;
    setCurrencyState(value);
    window.sessionStorage.setItem(STORAGE_KEY, value);
  }, []);

  const value = React.useMemo(() => ({ currency, setCurrency, available }), [available, currency, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
