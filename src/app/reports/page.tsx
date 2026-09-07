"use client";

import * as React from "react";
import { FileBarChart, FileSpreadsheet, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, PageHeader } from "@/components/ui/Primitives";
import { Select } from "@/components/ui/Field";
import { StatCard } from "@/components/ui/StatCard";
import { useExpenses, useIncome, useLoans, usePortfolio, useProperties, usePurchases } from "@/hooks/useData";
import {
  availableFinancialYears,
  calculateGearing,
  financialYearLabel,
  financialYearRange,
  inFinancialYear,
  propertyMetrics,
  sum
} from "@/lib/calc";
import { formatDate, money, percent, titleise } from "@/lib/format";
import { exportBudgetWorkbook, exportPortfolioWorkbook, exportSingleSheet, exportSingleSheetCsv } from "@/lib/export/excel";
import { exportPortfolioPdf } from "@/lib/export/pdf";
import { EXPORTS_ENABLED } from "@/lib/features";
import { useToast } from "@/components/ui/Toast";

const sheetShortcuts = [
  "Properties",
  "Purchase Details",
  "Finance & Offset",
  "Income",
  "Expenses",
  "Tax Summary",
  "Contacts & Insurance",
  "Reminders"
];

export default function ReportsPage() {
  const toast = useToast();
  const properties = useProperties() ?? [];
  const purchases = usePurchases() ?? [];
  const loans = useLoans() ?? [];
  const income = useIncome() ?? [];
  const expenses = useExpenses() ?? [];
  const { totals } = usePortfolio();

  const years = availableFinancialYears(income, expenses);
  const [fy, setFy] = React.useState<number>(years[0] ?? new Date().getFullYear());
  const range = financialYearRange(fy);

  const fyIncome = income.filter((entry) => inFinancialYear(entry.date, fy));
  const fyExpenses = expenses.filter((entry) => inFinancialYear(entry.date, fy));

  const gross = sum(fyIncome.map((entry) => entry.amount));
  const fees = sum(fyIncome.map((entry) => entry.managementFee));
  const deductible = sum(fyExpenses.filter((entry) => entry.taxDeductible && !entry.capital).map((entry) => entry.amount));
  const capital = sum(fyExpenses.filter((entry) => entry.capital).map((entry) => entry.amount));

  const gearing = calculateGearing(
    properties.map((property) => {
      const propIncome = fyIncome.filter((entry) => entry.propertyId === property.id);
      const propExpenses = fyExpenses.filter((entry) => entry.propertyId === property.id);
      const propGross = sum(propIncome.map((entry) => entry.amount));
      const propFees = sum(propIncome.map((entry) => entry.managementFee));
      const propDeductible = sum(
        propExpenses.filter((entry) => entry.taxDeductible && !entry.capital).map((entry) => entry.amount)
      );
      return { propertyId: property.id, taxTreatment: property.taxTreatment, taxable: propGross - propFees - propDeductible };
    })
  );
  const taxable = gearing.combinedTaxable;

  const byProperty = properties.map((property) =>
    propertyMetrics(
      property,
      purchases.find((purchase) => purchase.propertyId === property.id),
      loans.find((loan) => loan.propertyId === property.id),
      fyIncome.filter((entry) => entry.propertyId === property.id),
      fyExpenses.filter((entry) => entry.propertyId === property.id)
    )
  );

  const categoryTotals = React.useMemo(() => {
    const map = new Map<string, number>();
    fyExpenses.forEach((entry) => map.set(entry.category, (map.get(entry.category) ?? 0) + entry.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [fyExpenses]);

  const run = async (task: () => Promise<void> | void, label: string) => {
    await task();
    toast(`${label} exported`);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`Financial year ${financialYearLabel(fy)} · ${formatDate(range.start)} – ${formatDate(range.end)}`}
        actions={
          <>
            <Select
              className="h-11 w-36"
              value={String(fy)}
              onChange={(event) => setFy(Number(event.target.value))}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {financialYearLabel(year)}
                </option>
              ))}
            </Select>
            {EXPORTS_ENABLED ? (
              <>
                <Button variant="secondary" onClick={() => run(() => exportPortfolioPdf(fy), "PDF report")}>
                  <FileText size={16} /> PDF
                </Button>
                <Button onClick={() => run(() => exportPortfolioWorkbook(fy), "Excel workbook")}>
                  <FileSpreadsheet size={16} /> Excel workbook
                </Button>
                <Button variant="secondary" onClick={() => run(() => exportBudgetWorkbook(), "Budgeting workbook")}>
                  <FileSpreadsheet size={16} /> Budgeting format
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross income" value={money(gross)} tone="positive" />
        <StatCard label="Deductible expenses" value={money(deductible + fees)} tone="negative" />
        <StatCard label="Capital works" value={money(capital)} tone="warning" />
        <StatCard
          label="Net taxable position"
          value={money(taxable)}
          tone={taxable >= 0 ? "positive" : "negative"}
          helper={taxable >= 0 ? "Positively geared" : "Negatively geared"}
        />
      </section>

      {gearing.heldLosses !== 0 ? (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Held within properties</p>
              <p className="mt-0.5 text-xs text-muted">
                Quarantined per current negative-gearing rules — not offset against other income.
              </p>
            </div>
            <span className="text-lg font-bold text-negative">{money(gearing.heldLosses)}</span>
          </CardBody>
        </Card>
      ) : null}

      {EXPORTS_ENABLED ? <Card>
        <CardHeader title="Accountant export pack" subtitle="One click per schedule — Excel or CSV" />
        <CardBody className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {sheetShortcuts.map((sheet) => (
            <div key={sheet} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-bg/40 px-3 py-2.5">
              <span className="truncate text-sm font-medium">{sheet}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label={`Export ${sheet} to Excel`} onClick={() => run(() => exportSingleSheet(sheet, fy), sheet)}>
                  <FileSpreadsheet size={16} />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Export ${sheet} to CSV`} onClick={() => run(() => exportSingleSheetCsv(sheet, fy), sheet)}>
                  <Download size={16} />
                </Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Property performance" subtitle={financialYearLabel(fy)} />
          <CardBody className="p-0">
            <div className="table-wrap border-0">
              <table className="data-table min-w-[560px]">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th className="text-right">Income</th>
                    <th className="text-right">Expenses</th>
                    <th className="text-right">Net</th>
                    <th className="text-right">Yield</th>
                    <th className="text-right">Gearing</th>
                  </tr>
                </thead>
                <tbody>
                  {byProperty.map((metric) => {
                    const held = gearing.byProperty.find((entry) => entry.propertyId === metric.property.id)?.held;
                    return (
                      <tr key={metric.property.id}>
                        <td className="max-w-[200px] truncate font-medium">{metric.property.name}</td>
                        <td className="text-right text-positive">{money(metric.income)}</td>
                        <td className="text-right text-negative">{money(metric.expenses)}</td>
                        <td className="text-right font-semibold">{money(metric.cashflow)}</td>
                        <td className="text-right">{percent(metric.netYield, 2)}</td>
                        <td className="text-right">
                          <Badge tone={held ? "warning" : "neutral"}>{held ? "Held" : "Offset"}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Expense schedule" subtitle="Grouped by category" />
          <CardBody className="p-0">
            <div className="table-wrap border-0">
              <table className="data-table min-w-[420px]">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTotals.map(([category, amount]) => (
                    <tr key={category}>
                      <td>{titleise(category)}</td>
                      <td className="text-right font-medium">{money(amount)}</td>
                      <td className="text-right text-muted">
                        {percent(sum(fyExpenses.map((entry) => entry.amount)) > 0 ? (amount / sum(fyExpenses.map((entry) => entry.amount))) * 100 : 0, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Portfolio position" subtitle="Live, all-time" action={<FileBarChart size={18} className="text-muted" />} />
        <CardBody className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {(
            [
              ["Valuation", money(totals.valuation)],
              ["Debt", money(totals.debt)],
              ["Offset", money(totals.offset)],
              ["Equity", money(totals.equity)],
              ["LVR", percent(totals.lvr, 1)],
              ["Net yield", percent(totals.netYield, 2)]
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-bg/40 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
              <p className="mt-0.5 text-lg font-bold">{value}</p>
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}
