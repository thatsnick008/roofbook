"use client";

import * as React from "react";
import { CalendarCheck, Download, FileSpreadsheet, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { db, nowIso, uid } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { Select } from "@/components/ui/Field";
import { StatCard } from "@/components/ui/StatCard";
import { IncomeForm } from "@/components/forms/IncomeForm";
import { useExpenses, useIncome, useProperties } from "@/hooks/useData";
import { useCurrencyFilter } from "@/components/providers/CurrencyProvider";
import { availableFinancialYears, financialYearLabel, inFinancialYear, managementFeeFor, rentAmountPerPeriod, sum } from "@/lib/calc";
import { formatDate, money, titleise } from "@/lib/format";
import { exportSingleSheet, exportSingleSheetCsv } from "@/lib/export/excel";
import { EXPORTS_ENABLED } from "@/lib/features";
import { useToast } from "@/components/ui/Toast";
import type { IncomeEntry, Property } from "@/lib/types";

export default function IncomePage() {
  const toast = useToast();
  const { currency } = useCurrencyFilter();
  const properties = useProperties() ?? [];
  const income = useIncome() ?? [];
  const expenses = useExpenses() ?? [];

  const years = availableFinancialYears(income, expenses);
  const [fy, setFy] = React.useState<number | "all">(years[0] ?? "all");
  const [propertyId, setPropertyId] = React.useState("all");
  const [editing, setEditing] = React.useState<IncomeEntry | undefined>();
  const [defaultPropertyId, setDefaultPropertyId] = React.useState<string | undefined>();
  const [open, setOpen] = React.useState(false);

  const rows = income
    .filter((entry) => (propertyId === "all" ? true : entry.propertyId === propertyId))
    .filter((entry) => (fy === "all" ? true : inFinancialYear(entry.date, fy)))
    .sort((a, b) => b.date.localeCompare(a.date));

  const gross = sum(rows.map((entry) => entry.amount));
  const fees = sum(rows.map((entry) => entry.managementFee));
  const arrears = rows.filter((entry) => entry.status === "arrears").length;
  const vacant = rows.filter((entry) => entry.status === "vacant").length;
  const rentRun = properties
    .filter((property) => !property.archived && property.annualRent > 0)
    .map((property) => {
      const period = currentRentPeriod(property.rentFrequency);
      const existing = income.find(
        (entry) =>
          entry.propertyId === property.id &&
          entry.category === "rent" &&
          entry.periodStart === period.start &&
          entry.periodEnd === period.end
      );
      return { property, period, entry: existing ?? rentEntry(property, period) };
    });

  const remove = async (id: string) => {
    await db.income.delete(id);
    toast("Income entry deleted", "info");
  };

  return (
    <>
      <PageHeader
        title="Income"
        subtitle="Rent, arrears recovery and other property income."
        actions={
          <>
            {EXPORTS_ENABLED ? (
              <>
                <Button variant="secondary" onClick={() => exportSingleSheetCsv("Income", fy === "all" ? undefined : fy, currency)}>
                  <FileSpreadsheet size={16} /> CSV
                </Button>
                <Button variant="secondary" onClick={() => exportSingleSheet("Income", fy === "all" ? undefined : fy, currency)}>
                  <Download size={16} /> Excel
                </Button>
              </>
            ) : null}
            <Button
              onClick={() => {
                setEditing(undefined);
                setDefaultPropertyId(undefined);
                setOpen(true);
              }}
            >
              <Plus size={16} /> Record income
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross income" value={money(gross)} tone="positive" icon={<Wallet size={20} />} />
        <StatCard label="Management fees" value={money(fees)} tone="negative" />
        <StatCard label="Net income" value={money(gross - fees)} />
        <StatCard label="Arrears / vacancy" value={`${arrears} / ${vacant}`} tone="warning" helper="Entries flagged" />
      </section>

      {rentRun.length ? (
        <Card>
          <CardHeader title="Rent run" subtitle="Mark the current scheduled rent as paid, or edit it first." />
          <CardBody className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rentRun.map(({ property, period, entry }) => {
              const paid = entry.status === "received" && income.some((item) => item.id === entry.id);
              return (
                <div key={property.id} className="rounded-2xl border border-border bg-bg/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{property.name}</p>
                      <p className="text-xs text-muted">
                        {titleise(property.rentFrequency)} · {formatDate(period.start)} to {formatDate(period.end)}
                      </p>
                    </div>
                    <Badge tone={paid ? "positive" : "warning"}>{paid ? "Paid" : "Due"}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted">Rent</p>
                      <p className="font-semibold">{money(entry.amount, true, property.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted">Fee</p>
                      <p className="font-semibold text-muted">{money(entry.managementFee, true, property.currency)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={paid}
                      onClick={async () => {
                        await db.income.put({ ...entry, status: "received", updatedAt: nowIso() });
                        toast("Rent marked paid");
                      }}
                    >
                      <CalendarCheck size={14} /> Mark paid
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(entry);
                        setDefaultPropertyId(property.id);
                        setOpen(true);
                      }}
                    >
                      Edit value
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Ledger"
          subtitle={`${rows.length} entries`}
          action={
            <div className="flex gap-2">
              <Select
                className="h-9 w-40 text-xs"
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
              >
                <option value="all">All properties</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </Select>
              <Select
                className="h-9 w-32 text-xs"
                value={String(fy)}
                onChange={(event) => setFy(event.target.value === "all" ? "all" : Number(event.target.value))}
              >
                <option value="all">All years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {financialYearLabel(year)}
                  </option>
                ))}
              </Select>
            </div>
          }
        />
        <CardBody className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Wallet size={22} />}
              title="No income recorded"
              description="Log your first rent payment to start tracking cashflow, arrears and vacancy."
              action={
                <Button
                  onClick={() => {
                    setEditing(undefined);
                    setDefaultPropertyId(undefined);
                    setOpen(true);
                  }}
                >
                  Record income
                </Button>
              }
            />
          ) : (
            <div className="table-wrap border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Property</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Fee</th>
                    <th className="text-right">Net</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.date)}</td>
                      <td className="max-w-[180px] truncate">
                        {properties.find((property) => property.id === entry.propertyId)?.name ?? "—"}
                      </td>
                      <td>{titleise(entry.category)}</td>
                      <td>
                        <Badge
                          tone={
                            entry.status === "received"
                              ? "positive"
                              : entry.status === "arrears"
                                ? "negative"
                                : entry.status === "vacant"
                                  ? "warning"
                                  : "neutral"
                          }
                        >
                          {titleise(entry.status)}
                        </Badge>
                      </td>
                      <td className="text-right font-medium">{money(entry.amount, true)}</td>
                      <td className="text-right text-muted">{money(entry.managementFee, true)}</td>
                      <td className="text-right font-semibold">{money(entry.amount - entry.managementFee, true)}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {entry.status === "pending" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Mark paid"
                              onClick={async () => {
                                await db.income.put({ ...entry, status: "received", updatedAt: nowIso() });
                                toast("Rent marked paid");
                              }}
                            >
                              <CalendarCheck size={15} className="text-positive" />
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit"
                            onClick={() => {
                              setEditing(entry);
                              setDefaultPropertyId(entry.propertyId);
                              setOpen(true);
                            }}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(entry.id)}>
                            <Trash2 size={15} className="text-negative" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <IncomeForm open={open} onClose={() => setOpen(false)} entry={editing} defaultPropertyId={defaultPropertyId} />
    </>
  );
}

function currentRentPeriod(frequency: Property["rentFrequency"]): { start: string; end: string } {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (frequency === "monthly") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start: toIsoDate(start), end: toIsoDate(end) };
  }

  const day = date.getDay() || 7;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - day + 1);

  if (frequency === "weekly") {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return { start: toIsoDate(weekStart), end: toIsoDate(end) };
  }

  const anchor = new Date(date.getFullYear(), 0, 1);
  const daysSinceAnchor = Math.floor((weekStart.getTime() - anchor.getTime()) / 86_400_000);
  if (Math.floor(daysSinceAnchor / 7) % 2 !== 0) weekStart.setDate(weekStart.getDate() - 7);
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 13);
  return { start: toIsoDate(weekStart), end: toIsoDate(end) };
}

function rentEntry(property: Property, period: { start: string; end: string }): IncomeEntry {
  const amount = rentAmountPerPeriod(property);
  return {
    id: uid(),
    propertyId: property.id,
    date: period.end,
    periodStart: period.start,
    periodEnd: period.end,
    category: "rent",
    status: "pending",
    amount,
    managementFee: managementFeeFor(property, amount),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
