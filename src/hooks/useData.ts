"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings } from "@/lib/db";
import { propertyMetrics, portfolioTotals, type PropertyMetrics } from "@/lib/calc";
import { useCurrencyFilter, DEFAULT_CURRENCY } from "@/components/providers/CurrencyProvider";
import type { AppSettings, CurrencyCode, PortfolioTotals, Property } from "@/lib/types";

export { DEFAULT_CURRENCY };

export const currencyOf = (property: Pick<Property, "currency">): CurrencyCode => property.currency ?? DEFAULT_CURRENCY;

/** Resolves the active currency to the set of property ids every other hook is scoped to. */
function useCurrencyScope(): Set<string> {
  const { currency } = useCurrencyFilter();
  const properties = useLiveQuery(() => db.properties.toArray(), [], undefined);

  return React.useMemo(
    () =>
      new Set(
        (properties ?? []).filter((property) => currencyOf(property) === currency).map((property) => property.id)
      ),
    [currency, properties]
  );
}

function useScopedByProperty<T extends { propertyId: string }>(rows: T[] | undefined): T[] | undefined {
  const ids = useCurrencyScope();
  return React.useMemo(() => (rows ? rows.filter((row) => ids.has(row.propertyId)) : rows), [ids, rows]);
}

/** Records without a property are portfolio-wide, so they stay visible under every currency. */
function useScopedByOptionalProperty<T extends { propertyId?: string }>(rows: T[] | undefined): T[] | undefined {
  const ids = useCurrencyScope();
  return React.useMemo(
    () => (rows ? rows.filter((row) => !row.propertyId || ids.has(row.propertyId)) : rows),
    [ids, rows]
  );
}

export function useProperties() {
  const ids = useCurrencyScope();
  const properties = useLiveQuery(() => db.properties.toArray(), [], undefined);
  return React.useMemo(
    () => (properties ? properties.filter((property) => ids.has(property.id)) : properties),
    [ids, properties]
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
