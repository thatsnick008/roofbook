"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { db, deleteProperty } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { MiniStat, StatCard } from "@/components/ui/StatCard";
import { PropertyForm } from "@/components/forms/PropertyForm";
import { QuickAdd } from "@/components/quick/QuickAdd";
import { CashflowChart } from "@/components/charts/Charts";
import {
  annualInterestForecast,
  costBase,
  groupByMonth,
  monthlyRepayment,
  offsetSavingsPerYear,
  propertyMetrics,
  totalCapitalRequired
} from "@/lib/calc";
import { cn, formatDate, money, percent, titleise } from "@/lib/format";
import { exportPortfolioWorkbook } from "@/lib/export/excel";
import { useToast } from "@/components/ui/Toast";

const tabs = ["Overview", "Purchase", "Finance", "Income", "Expenses"] as const;

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = params.id;
  const [tab, setTab] = React.useState<(typeof tabs)[number]>("Overview");
  const [editOpen, setEditOpen] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState(false);

  const data = useLiveQuery(async () => {
    const property = await db.properties.get(id);
    if (!property) return null;
    const [purchase, loan, income, expenses, reminders] = await Promise.all([
      db.purchases.where("propertyId").equals(id).first(),
      db.loans.where("propertyId").equals(id).first(),
      db.income.where("propertyId").equals(id).toArray(),
      db.expenses.where("propertyId").equals(id).toArray(),
      db.reminders.where("propertyId").equals(id).toArray()
    ]);
    return { property, purchase, loan, income, expenses, reminders };
  }, [id]);

  if (data === undefined) return <p className="text-sm text-muted">Loading…</p>;
  if (data === null) {
    return (
      <EmptyState
        title="Property not found"
        description="It may have been deleted on this device."
        action={
          <Link href="/properties">
            <Button variant="secondary">Back to properties</Button>
          </Link>
        }
      />
    );
  }

  const { property, purchase, loan, income, expenses, reminders } = data;
  const metric = propertyMetrics(property, purchase, loan, income, expenses);
  const monthly = groupByMonth(income, expenses);

  const remove = async () => {
    if (!window.confirm(`Delete ${property.name} and all associated records? This cannot be undone.`)) return;
    await deleteProperty(property.id);
    toast("Property deleted", "info");
    router.push("/properties");
  };

  return (
    <>
      <Link href="/properties" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft size={16} /> Properties
      </Link>

      <PageHeader
        title={property.name}
        subtitle={`${property.address}, ${property.suburb} ${property.state} ${property.postcode}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setQuickOpen(true)}>
              <Plus size={16} /> Add entry
            </Button>
            <Button variant="secondary" onClick={() => exportPortfolioWorkbook()}>
              <Download size={16} /> Excel
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil size={16} /> Edit
            </Button>
            <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete property">
              <Trash2 size={17} className="text-negative" />
            </Button>
          </>
        }
      />

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-1.5">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={cn(
              "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition",
              tab === item ? "bg-brand text-white" : "text-muted hover:text-fg"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Valuation" value={money(metric.valuation)} helper={formatDate(property.valuationDate)} />
            <StatCard label="Equity" value={money(metric.equity)} tone="positive" helper={percent(metric.lvr, 1) + " LVR"} />
            <StatCard label="Net cashflow" value={money(metric.cashflow)} tone={metric.cashflow >= 0 ? "positive" : "negative"} />
            <StatCard label="Net yield" value={percent(metric.netYield, 2)} helper={`Gross ${percent(metric.grossYield, 2)}`} />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Cashflow" subtitle="Rolling 12 months" />
              <CardBody>
                <CashflowChart data={monthly} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Snapshot" />
              <CardBody className="grid grid-cols-2 gap-3">
                <MiniStat label="Purchase price" value={purchase?.purchasePrice ?? 0} />
                <MiniStat label="Capital in" value={metric.capitalRequired} />
                <MiniStat label="Growth" value={metric.capitalGrowth} />
                <MiniStat label="Cash on cash" value={percent(metric.cashOnCash, 1)} />
                <MiniStat label="Loan" value={metric.debt} />
                <MiniStat label="Offset" value={metric.offset} />
                <MiniStat label="Income" value={metric.income} />
                <MiniStat label="Expenses" value={metric.expenses} />
              </CardBody>
            </Card>
          </section>

          <Card>
            <CardHeader
              title="Reminders"
              subtitle="Compliance for this property"
              action={
                <Link href="/reminders" className="text-sm font-semibold text-brand">
                  Manage
                </Link>
              }
            />
            <CardBody className="space-y-2">
              {reminders.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">No reminders yet.</p>
              ) : (
                reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-bg/40 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{reminder.title}</p>
                      <p className="text-xs text-muted">{titleise(reminder.category)}</p>
                    </div>
                    <Badge tone={reminder.completed ? "positive" : "warning"}>{formatDate(reminder.dueDate)}</Badge>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </>
      ) : null}

      {tab === "Purchase" ? (
        <Card>
          <CardHeader title="Purchase details" subtitle={formatDate(purchase?.purchaseDate)} />
          <CardBody>
            {purchase ? (
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["Valuation", purchase.valuation],
                    ["Purchase price", purchase.purchasePrice],
                    ["Loan before LMI", purchase.loanBeforeLmi],
                    ["LMI", purchase.lmi],
                    ["Loan after LMI", purchase.loanAfterLmi],
                    ["Deposit", purchase.deposit],
                    ["Stamp duty", purchase.stampDuty],
                    ["Legal fees", purchase.legalFees],
                    ["Renovations", purchase.renovations],
                    ["Settlement fees", purchase.settlementFees],
                    ["Building & pest", purchase.buildingAndPest],
                    ["Registration fees", purchase.registrationFees],
                    ["Other costs", purchase.otherCosts],
                    ["Cost base (CGT)", costBase(purchase)]
                  ] as [string, number][]
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border bg-bg/40 px-4 py-3">
                    <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
                    <dd className="mt-0.5 text-base font-semibold">{money(value)}</dd>
                  </div>
                ))}
                <div className="rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 sm:col-span-2 lg:col-span-3">
                  <dt className="text-[11px] uppercase tracking-wide text-brand">Total capital required</dt>
                  <dd className="mt-0.5 text-2xl font-bold">{money(totalCapitalRequired(purchase))}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted">No purchase details captured.</p>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "Finance" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Loan" subtitle={loan ? `${loan.bank} · ${loan.accountName}` : "Not configured"} />
            <CardBody className="grid grid-cols-2 gap-3">
              <MiniStat label="Balance" value={loan?.loanBalance ?? 0} />
              <MiniStat label="Offset" value={loan?.offsetBalance ?? 0} />
              <MiniStat label="Effective debt" value={Math.max((loan?.loanBalance ?? 0) - (loan?.offsetBalance ?? 0), 0)} />
              <MiniStat label="Rate" value={percent(loan?.interestRate ?? 0)} />
              <MiniStat label="Repayment" value={monthlyRepayment(loan)} />
              <MiniStat label="Type" value={titleise(loan?.repaymentType ?? "—")} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Interest forecast" subtitle="Next 12 months" />
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border bg-bg/40 px-4 py-3">
                <span className="text-sm text-muted">Forecast interest</span>
                <span className="text-lg font-bold text-negative">{money(annualInterestForecast(loan))}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-positive/30 bg-positive/10 px-4 py-3">
                <span className="text-sm text-muted">Offset saving</span>
                <span className="text-lg font-bold text-positive">{money(offsetSavingsPerYear(loan))}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-bg/40 px-4 py-3">
                <span className="text-sm text-muted">Interest paid (recorded)</span>
                <span className="text-lg font-bold">
                  {money(expenses.filter((entry) => entry.category === "interest").reduce((t, e) => t + e.amount, 0))}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === "Income" ? (
        <Card>
          <CardHeader title="Income ledger" subtitle={`${income.length} entries · ${money(metric.income)}`} />
          <CardBody className="p-0">
            <div className="table-wrap border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Mgmt fee</th>
                    <th className="text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {income
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.date)}</td>
                        <td>{titleise(entry.category)}</td>
                        <td>
                          <Badge tone={entry.status === "received" ? "positive" : entry.status === "arrears" ? "negative" : "warning"}>
                            {titleise(entry.status)}
                          </Badge>
                        </td>
                        <td className="text-right font-medium">{money(entry.amount, true)}</td>
                        <td className="text-right text-muted">{money(entry.managementFee, true)}</td>
                        <td className="text-right font-semibold">{money(entry.amount - entry.managementFee, true)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {tab === "Expenses" ? (
        <Card>
          <CardHeader title="Expense ledger" subtitle={`${expenses.length} entries · ${money(metric.expenses)}`} />
          <CardBody className="p-0">
            <div className="table-wrap border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">GST</th>
                    <th>Deductible</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.date)}</td>
                        <td>{titleise(entry.category)}</td>
                        <td className="text-muted">{entry.supplier ?? "—"}</td>
                        <td className="text-right font-medium">{money(entry.amount, true)}</td>
                        <td className="text-right text-muted">{money(entry.gst, true)}</td>
                        <td>
                          <Badge tone={entry.taxDeductible ? "positive" : "neutral"}>
                            {entry.taxDeductible ? "Yes" : "No"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <PropertyForm open={editOpen} onClose={() => setEditOpen(false)} propertyId={property.id} />
      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} defaultPropertyId={property.id} />
    </>
  );
}
