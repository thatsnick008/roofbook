"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings } from "@/lib/db";
import { propertyMetrics, portfolioTotals, type PropertyMetrics } from "@/lib/calc";
import type { AppSettings, PortfolioTotals } from "@/lib/types";

export function useProperties() {
  return useLiveQuery(() => db.properties.toArray(), [], undefined);
}

export function useIncome(propertyId?: string) {
  return useLiveQuery(
    () => (propertyId ? db.income.where("propertyId").equals(propertyId).toArray() : db.income.toArray()),
    [propertyId],
    undefined
  );
}

export function useExpenses(propertyId?: string) {
  return useLiveQuery(
    () => (propertyId ? db.expenses.where("propertyId").equals(propertyId).toArray() : db.expenses.toArray()),
    [propertyId],
    undefined
  );
}

export function useLoans() {
  return useLiveQuery(() => db.loans.toArray(), [], undefined);
}

export function usePurchases() {
  return useLiveQuery(() => db.purchases.toArray(), [], undefined);
}

export function useReminders() {
  return useLiveQuery(() => db.reminders.orderBy("dueDate").toArray(), [], undefined);
}

export function useContacts() {
  return useLiveQuery(() => db.contacts.toArray(), [], undefined);
}

export function useDocuments() {
  return useLiveQuery(() => db.documents.reverse().sortBy("uploadedAt"), [], undefined);
}

export function useSettings(): AppSettings | undefined {
  return useLiveQuery(() => getSettings(), [], undefined);
}

export interface PortfolioSnapshot {
  loading: boolean;
  metrics: PropertyMetrics[];
  totals: PortfolioTotals;
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

  return { loading: !ready, metrics, totals: portfolioTotals(metrics) };
}
