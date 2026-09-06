"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  BellRing,
  Building2,
  Download,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { StatCard } from "@/components/ui/StatCard";
import { CashflowChart, CategoryDonut, EquityTrend } from "@/components/charts/Charts";
import { PropertyForm } from "@/components/forms/PropertyForm";
import { useExpenses, useIncome, usePortfolio, useReminders } from "@/hooks/useData";
import { groupByMonth, sum } from "@/lib/calc";
import { compactMoney, daysUntil, formatDate, money, percent, titleise } from "@/lib/format";
import { exportPortfolioWorkbook } from "@/lib/export/excel";
import { seedDemoData } from "@/lib/seed";
import { useToast } from "@/components/ui/Toast";
import { accentPalette } from "@/lib/options";
import { EXPORTS_ENABLED } from "@/lib/features";
import type { ExpenseEntry, IncomeEntry, Reminder } from "@/lib/types";

const EMPTY_INCOME: IncomeEntry[] = [];
const EMPTY_EXPENSES: ExpenseEntry[] = [];
const EMPTY_REMINDERS: Reminder[] = [];

export default function DashboardPage() {
  const toast = useToast();
  const { loading, metrics, totals } = usePortfolio();
  const income = useIncome() ?? EMPTY_INCOME;
  const expenses = useExpenses() ?? EMPTY_EXPENSES;
  const reminders = useReminders() ?? EMPTY_REMINDERS;
  const [addOpen, setAddOpen] = React.useState(false);

  const annualDepreciation = sum(metrics.map((metric) => metric.annualDepreciation));
  const monthly = React.useMemo(() => groupByMonth(income, expenses, annualDepreciation), [income, expenses, annualDepreciation]);
  const latestMonth = monthly[monthly.length - 1];
  const upcoming = reminders.filter((reminder) => !reminder.completed).slice(0, 5);

  const categoryData = React.useMemo(() => {
    const totalsByCategory = new Map<string, number>();
    expenses.forEach((entry) =>
      totalsByCategory.set(entry.category, (totalsByCategory.get(entry.category) ?? 0) + entry.amount)
    );
    return [...totalsByCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({
        name: titleise(name),
        value: Math.round(value),
        color: accentPalette[index % accentPalette.length]
      }));
  }, [expenses]);

  const handleSeed = async () => {
    await seedDemoData();
    toast("Demo portfolio loaded");
  };

  if (!loading && metrics.length === 0) {
    return (
      <>
        <PageHeader title="Roofbook" subtitle="Your portfolio, end to end — stored privately on this device." />
        <EmptyState
          icon={<Building2 size={26} />}
          title="Add your first property"
          description="Track purchase costs, loans and offsets, rent, holding costs, compliance reminders and tax-ready reports."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setAddOpen(true)}>
                <Building2 size={16} /> Add property
              </Button>
              <Button variant="secondary" onClick={handleSeed}>
                <Sparkles size={16} /> Load demo data
              </Button>
            </div>
          }
        />
        <PropertyForm open={addOpen} onClose={() => setAddOpen(false)} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Roofbook"
        subtitle={`${totals.properties} ${totals.properties === 1 ? "property" : "properties"} · data stored locally on this device`}
        actions={
          <>
            {EXPORTS_ENABLED ? (
              <Button variant="secondary" onClick={() => exportPortfolioWorkbook()}>
                <Download size={16} /> Export Excel
              </Button>
            ) : null}
            <Button onClick={() => setAddOpen(true)}>
              <Building2 size={16} /> Add property
            </Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          className="p-4"
          label="Portfolio value"
          value={money(totals.valuation)}
          helper={`${percent(totals.lvr, 1)} LVR`}
          icon={<Building2 size={20} />}
        />
        <StatCard
          className="p-4"
          label="Net equity"
          value={money(totals.equity)}
          helper={`${compactMoney(totals.offset)} in offset`}
          tone="positive"
          icon={<PiggyBank size={20} />}
        />
        <StatCard
          className="p-4"
          label="Debt"
          value={money(totals.debt)}
          helper="Across all facilities"
          tone="negative"
          icon={<Banknote size={20} />}
        />
        <StatCard
          className="p-4"
          label="Net cashflow"
          value={money(latestMonth?.net ?? 0)}
          helper={`${latestMonth?.month ?? "This month"} · ${money(totals.cashflow)} total`}
          tone={totals.cashflow >= 0 ? "positive" : "warning"}
          icon={<TrendingUp size={20} />}
        />
        <StatCard
          className="p-4"
          label="Net LVR"
          value={percent(totals.netLvr, 1)}
          helper={`${compactMoney(totals.offset)} offset against debt`}
          icon={<Wallet size={20} />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Income vs expenses" subtitle="Rolling 12 months" />
          <CardBody>
            <CashflowChart data={monthly} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Expense mix" subtitle="Top categories" />
          <CardBody>
            {categoryData.length ? (
              <>
                <CategoryDonut data={categoryData} />
                <ul className="mt-3 space-y-1.5">
                  {categoryData.map((item) => (
                    <li key={item.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                        {item.name}
                      </span>
                      <span className="font-semibold">{money(item.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-muted">No expenses recorded yet.</p>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Properties"
            subtitle="Live performance per asset"
            action={
              <Link href="/properties" className="text-sm font-semibold text-brand">
                View all
              </Link>
            }
          />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <Link
                key={metric.property.id}
                href={`/properties/${metric.property.id}`}
                className="group rounded-2xl border border-border bg-bg/40 p-4 transition hover:border-brand/40 hover:bg-brand/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{metric.property.name}</p>
                    <p className="truncate text-xs text-muted">
                      {metric.property.suburb} {metric.property.state}
                    </p>
                  </div>
                  <span className="h-8 w-8 shrink-0 rounded-xl" style={{ background: metric.property.accent }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted">Value</p>
                    <p className="font-semibold">{compactMoney(metric.valuation)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted">Equity</p>
                    <p className="font-semibold text-positive">{compactMoney(metric.equity)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted">LVR</p>
                    <p className="font-semibold">{percent(metric.lvr, 1)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted">Cashflow</p>
                    <p className={metric.cashflow >= 0 ? "font-semibold text-positive" : "font-semibold text-negative"}>
                      {compactMoney(metric.cashflow)}
                    </p>
                  </div>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand opacity-0 transition group-hover:opacity-100">
                  Open <ArrowUpRight size={14} />
                </span>
              </Link>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Upcoming"
              subtitle="Next compliance actions"
              action={
                <Link href="/reminders" className="text-sm font-semibold text-brand">
                  All
                </Link>
              }
            />
            <CardBody className="space-y-2.5">
              {upcoming.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Nothing scheduled.</p>
              ) : (
                upcoming.map((reminder) => {
                  const days = daysUntil(reminder.dueDate);
                  return (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg/40 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{reminder.title}</p>
                        <p className="text-xs text-muted">{formatDate(reminder.dueDate)}</p>
                      </div>
                      <Badge tone={days < 0 ? "negative" : days <= 14 ? "warning" : "neutral"}>
                        <BellRing size={12} />
                        {days < 0 ? `${Math.abs(days)}d late` : `${days}d`}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Net cashflow trend" subtitle="Monthly" />
            <CardBody>
              <EquityTrend data={monthly} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Rent collected" subtitle="All time" />
            <CardBody className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted">
                <Wallet size={16} /> {income.length} entries
              </span>
              <span className="text-xl font-bold">{money(totals.income)}</span>
            </CardBody>
          </Card>
        </div>
      </section>

      <PropertyForm open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
