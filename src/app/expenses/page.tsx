"use client";

import * as React from "react";
import { Download, FileSpreadsheet, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { Select } from "@/components/ui/Field";
import { StatCard } from "@/components/ui/StatCard";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { useExpenses, useIncome, useProperties } from "@/hooks/useData";
import { availableFinancialYears, financialYearLabel, inFinancialYear, sum } from "@/lib/calc";
import { formatDate, money, titleise } from "@/lib/format";
import { exportSingleSheet, exportSingleSheetCsv } from "@/lib/export/excel";
import { expenseCategories } from "@/lib/options";
import { useToast } from "@/components/ui/Toast";
import type { ExpenseEntry } from "@/lib/types";

export default function ExpensesPage() {
  const toast = useToast();
  const properties = useProperties() ?? [];
  const income = useIncome() ?? [];
  const expenses = useExpenses() ?? [];

  const years = availableFinancialYears(income, expenses);
  const [fy, setFy] = React.useState<number | "all">(years[0] ?? "all");
  const [propertyId, setPropertyId] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [editing, setEditing] = React.useState<ExpenseEntry | undefined>();
  const [open, setOpen] = React.useState(false);

  const rows = expenses
    .filter((entry) => (propertyId === "all" ? true : entry.propertyId === propertyId))
    .filter((entry) => (category === "all" ? true : entry.category === category))
    .filter((entry) => (fy === "all" ? true : inFinancialYear(entry.date, fy)))
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = sum(rows.map((entry) => entry.amount));
  const gst = sum(rows.map((entry) => entry.gst));
  const deductible = sum(rows.filter((entry) => entry.taxDeductible && !entry.capital).map((entry) => entry.amount));
  const capital = sum(rows.filter((entry) => entry.capital).map((entry) => entry.amount));

  const remove = async (id: string) => {
    await db.expenses.delete(id);
    toast("Expense deleted", "info");
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Holding costs, maintenance, compliance and deductions."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportSingleSheetCsv("Expenses", fy === "all" ? undefined : fy)}>
              <FileSpreadsheet size={16} /> CSV
            </Button>
            <Button variant="secondary" onClick={() => exportSingleSheet("Expenses", fy === "all" ? undefined : fy)}>
              <Download size={16} /> Excel
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus size={16} /> Log expense
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total expenses" value={money(total)} tone="negative" icon={<Receipt size={20} />} />
        <StatCard label="GST component" value={money(gst)} />
        <StatCard label="Deductible" value={money(deductible)} tone="positive" />
        <StatCard label="Capital works" value={money(capital)} tone="warning" helper="Depreciated over time" />
      </section>

      <Card>
        <CardHeader
          title="Ledger"
          subtitle={`${rows.length} entries`}
          action={
            <div className="flex flex-wrap gap-2">
              <Select
                className="h-9 w-36 text-xs"
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
              <Select className="h-9 w-40 text-xs" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All categories</option>
                {expenseCategories.map((item) => (
                  <option key={item} value={item}>
                    {titleise(item)}
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
              icon={<Receipt size={22} />}
              title="No expenses recorded"
              description="Capture rates, insurance, management fees and repairs to build a tax-ready record."
              action={
                <Button
                  onClick={() => {
                    setEditing(undefined);
                    setOpen(true);
                  }}
                >
                  Log expense
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
                    <th>Supplier</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">GST</th>
                    <th>Tax</th>
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
                      <td className="text-muted">{entry.supplier ?? "—"}</td>
                      <td className="text-right font-medium">{money(entry.amount, true)}</td>
                      <td className="text-right text-muted">{money(entry.gst, true)}</td>
                      <td>
                        <Badge tone={entry.capital ? "warning" : entry.taxDeductible ? "positive" : "neutral"}>
                          {entry.capital ? "Capital" : entry.taxDeductible ? "Deductible" : "Private"}
                        </Badge>
                      </td>
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

      <ExpenseForm open={open} onClose={() => setOpen(false)} entry={editing} />
    </>
  );
}
