"use client";

import * as React from "react";
import { Download, FileSpreadsheet, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { Select } from "@/components/ui/Field";
import { StatCard } from "@/components/ui/StatCard";
import { IncomeForm } from "@/components/forms/IncomeForm";
import { useExpenses, useIncome, useProperties } from "@/hooks/useData";
import { availableFinancialYears, financialYearLabel, inFinancialYear, sum } from "@/lib/calc";
import { formatDate, money, titleise } from "@/lib/format";
import { exportSingleSheet, exportSingleSheetCsv } from "@/lib/export/excel";
import { useToast } from "@/components/ui/Toast";
import type { IncomeEntry } from "@/lib/types";

export default function IncomePage() {
  const toast = useToast();
  const properties = useProperties() ?? [];
  const income = useIncome() ?? [];
  const expenses = useExpenses() ?? [];

  const years = availableFinancialYears(income, expenses);
  const [fy, setFy] = React.useState<number | "all">(years[0] ?? "all");
  const [propertyId, setPropertyId] = React.useState("all");
  const [editing, setEditing] = React.useState<IncomeEntry | undefined>();
  const [open, setOpen] = React.useState(false);

  const rows = income
    .filter((entry) => (propertyId === "all" ? true : entry.propertyId === propertyId))
    .filter((entry) => (fy === "all" ? true : inFinancialYear(entry.date, fy)))
    .sort((a, b) => b.date.localeCompare(a.date));

  const gross = sum(rows.map((entry) => entry.amount));
  const fees = sum(rows.map((entry) => entry.managementFee));
  const arrears = rows.filter((entry) => entry.status === "arrears").length;
  const vacant = rows.filter((entry) => entry.status === "vacant").length;

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
            <Button variant="secondary" onClick={() => exportSingleSheetCsv("Income", fy === "all" ? undefined : fy)}>
              <FileSpreadsheet size={16} /> CSV
            </Button>
            <Button variant="secondary" onClick={() => exportSingleSheet("Income", fy === "all" ? undefined : fy)}>
              <Download size={16} /> Excel
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
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
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit"
                            onClick={() => {
                              setEditing(entry);
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

      <IncomeForm open={open} onClose={() => setOpen(false)} entry={editing} />
    </>
  );
}
