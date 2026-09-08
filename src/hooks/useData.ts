"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings } from "@/lib/db";
import { propertyMetrics, portfolioTotals, type PropertyMetrics } from "@/lib/calc";
import { useCurrencyFilter } from "@/components/providers/CurrencyProvider";
import type { AppSettings, CurrencyCode, PortfolioTotals, Property } from "@/lib/types";

export const DEFAULT_CURRENCY: CurrencyCode = "AUD";

export const currencyOf = (property: Pick<Property, "currency">): CurrencyCode => property.currency ?? DEFAULT_CURRENCY;

/** Every currency present in the portfolio, ignoring the active filter so the picker never hides itself. */
export function usePortfolioCurrencies(): CurrencyCode[] {
  const properties = useLiveQuery(() => db.properties.toArray(), [], undefined);
  return React.useMemo(() => [...new Set((properties ?? []).map(currencyOf))].sort(), [properties]);
}

interface CurrencyScope {
  active: boolean;
  ids: Set<string>;
}

/** Resolves the session currency filter to the set of property ids every other hook is scoped to. */
function useCurrencyScope(): CurrencyScope {
  const { currency } = useCurrencyFilter();
  const properties = useLiveQuery(() => db.properties.toArray(), [], undefined);

  return React.useMemo(() => {
    if (currency === "all") return { active: false, ids: new Set<string>() };
    const ids = new Set(
      (properties ?? []).filter((property) => currencyOf(property) === currency).map((property) => property.id)
    );
    return { active: true, ids };
  }, [currency, properties]);
}

function useScopedByProperty<T extends { propertyId: string }>(rows: T[] | undefined): T[] | undefined {
  const scope = useCurrencyScope();
  return React.useMemo(
    () => (rows && scope.active ? rows.filter((row) => scope.ids.has(row.propertyId)) : rows),
    [rows, scope]
  );
}

/** Records without a property are portfolio-wide, so they stay visible under every currency. */
function useScopedByOptionalProperty<T extends { propertyId?: string }>(rows: T[] | undefined): T[] | undefined {
  const scope = useCurrencyScope();
  return React.useMemo(
    () => (rows && scope.active ? rows.filter((row) => !row.propertyId || scope.ids.has(row.propertyId)) : rows),
    [rows, scope]
  );
}

export function useProperties() {
  const scope = useCurrencyScope();
  const properties = useLiveQuery(() => db.properties.toArray(), [], undefined);
  return React.useMemo(
    () => (properties && scope.active ? properties.filter((property) => scope.ids.has(property.id)) : properties),
    [properties, scope]
  );
}

export function useIncome(propertyId?: string) {
  const rows = useLiveQuery(
    () => (propertyId ? db.income.where("propertyId").equals(propertyId).toArray() : db.income.toArray()),
    [propertyId],
    undefined
  );
  return useScopedByProperty(rows);
}

export function useExpenses(propertyId?: string) {
  const rows = useLiveQuery(
    () => (propertyId ? db.expenses.where("propertyId").equals(propertyId).toArray() : db.expenses.toArray()),
    [propertyId],
    undefined
  );
  return useScopedByProperty(rows);
}

export function useLoans() {
  return useScopedByProperty(useLiveQuery(() => db.loans.toArray(), [], undefined));
}

export function usePurchases() {
  return useScopedByProperty(useLiveQuery(() => db.purchases.toArray(), [], undefined));
}

export function useReminders() {
  return useScopedByOptionalProperty(useLiveQuery(() => db.reminders.orderBy("dueDate").toArray(), [], undefined));
}

export function useContacts() {
  return useScopedByOptionalProperty(useLiveQuery(() => db.contacts.toArray(), [], undefined));
}

export function useDocuments() {
  return useScopedByOptionalProperty(useLiveQuery(() => db.documents.reverse().sortBy("uploadedAt"), [], undefined));
}

export function useSettings(): AppSettings | undefined {
  return useLiveQuery(() => getSettings(), [], undefined);
}

export interface PortfolioSnapshot {
  loading: boolean;
  metrics: PropertyMetrics[];
  totals: PortfolioTotals;
  totalsByCurrency: (PortfolioTotals & { currency: CurrencyCode })[];
}

export function usePortfolio(): PortfolioSnapshot {
  const properties = useProperties();
  const purchases = usePurchases();
  const loans = useLoans();
  const income = useIncome();
  const expenses = useExpenses();

  const ready = Boolean(properties && purchases && loans && income && expenses);
  const metrics =
    properties && purchases && loans && income && expenses
      ? properties
          .filter((property) => !property.archived)
          .map((property) =>
            propertyMetrics(
              property,
              purchases.find((purchase) => purchase.propertyId === property.id),
              loans.find((loan) => loan.propertyId === property.id),
              income.filter((entry) => entry.propertyId === property.id),
              expenses.filter((entry) => entry.propertyId === property.id)
            )
          )
      : [];

  const totalsByCurrency = [...new Set(metrics.map((metric) => currencyOf(metric.property)))]
    .sort()
    .map((currency) => ({
      currency,
      ...portfolioTotals(metrics.filter((metric) => currencyOf(metric.property) === currency))
    }));

  return { loading: !ready, metrics, totals: portfolioTotals(metrics), totalsByCurrency };
}
