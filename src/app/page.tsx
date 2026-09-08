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
import { useCurrencyFilter } from "@/components/providers/CurrencyProvider";
import { groupByMonth, recognizedIncome, sum } from "@/lib/calc";
import { compactMoney, compactMoneyPerPeriod, daysUntil, formatDate, money, moneyPerPeriod, percent, titleise } from "@/lib/format";
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
  const { currency } = useCurrencyFilter();
  const { loading, metrics, totals, totalsByCurrency } = usePortfolio();
  const income = useIncome() ?? EMPTY_INCOME;
  const expenses = useExpenses() ?? EMPTY_EXPENSES;
  const reminders = useReminders() ?? EMPTY_REMINDERS;
  const [addOpen, setAddOpen] = React.useState(false);

  const upcoming = reminders.filter((reminder) => !reminder.completed).slice(0, 5);
  const currencyGroups = React.useMemo(
    () =>
      totalsByCurrency.map(({ currency, ...groupTotals }) => {
        const groupMetrics = metrics.filter((metric) => (metric.property.currency ?? "AUD") === currency);
        const propertyIds = new Set(groupMetrics.map((metric) => metric.property.id));
        const groupIncome = income.filter((entry) => propertyIds.has(entry.propertyId));
        const countedGroupIncome = recognizedIncome(groupIncome);
        const groupExpenses = expenses.filter((entry) => propertyIds.has(entry.propertyId));
        const annualDepreciation = sum(groupMetrics.map((metric) => metric.annualDepreciation));
        const monthly = groupByMonth(groupIncome, groupExpenses, annualDepreciation);
        const categoryTotals = new Map<string, number>();
        groupExpenses.forEach((entry) => {
          categoryTotals.set(entry.category, (categoryTotals.get(entry.category) ?? 0) + entry.amount);
        });
        const categoryData = [...categoryTotals.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value], index) => ({
            name: titleise(name),
            value: Math.round(value),
            color: accentPalette[index % accentPalette.length]
          }));

        return {
          currency,
          totals: groupTotals,
          metrics: groupMetrics,
          monthly,
          latestMonth: monthly[monthly.length - 1],
          categoryData,
          incomeEntries: countedGroupIncome.length
        };
      }),
    [expenses, income, metrics, totalsByCurrency]
  );

  const handleSeed = async () => {
    await seedDemoData();
    toast("Demo portfolio loaded");
  };

  if (!loading && metrics.length === 0) {
    return (
      <>
        <PageHeader title="Roofbook" subtitle="Your portfolio, end to end - stored privately on this device." />
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
        subtitle={`${totals.properties} ${totals.properties === 1 ? "property" : "properties"}`}
        actions={
          <>
            {EXPORTS_ENABLED ? (
              <Button variant="secondary" onClick={() => exportPortfolioWorkbook(undefined, currency)}>
                <Download size={16} /> Export Excel
              </Button>
            ) : null}
            <Button onClick={() => setAddOpen(true)}>
              <Building2 size={16} /> Add property
            </Button>
          </>
        }
      />

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

      {currencyGroups.map((group) => (
        <section key={group.currency} className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">{group.currency} dashboard</h2>
            <p className="text-sm text-muted">
              {group.metrics.length} {group.metrics.length === 1 ? "property" : "properties"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <StatCard
              className="p-4"
              label="Portfolio value"
              value={money(group.totals.valuation, false, group.currency)}
              helper={`${percent(group.totals.lvr, 1)} LVR`}
              icon={<Building2 size={20} />}
            />
            <StatCard
              className="p-4"
              label="Net equity"
              value={money(group.totals.equity, false, group.currency)}
              helper={`${compactMoney(group.totals.offset, group.currency)} in offset`}
              tone="positive"
              icon={<PiggyBank size={20} />}
            />
            <StatCard
              className="p-4"
              label="Debt"
              value={money(group.totals.debt, false, group.currency)}
              helper="Across all facilities"
              tone="negative"
              icon={<Banknote size={20} />}
            />
            <StatCard
              className="p-4"
              label="Net cashflow / month"
              value={moneyPerPeriod(group.latestMonth?.net ?? 0, "month", false, group.currency)}
              helper={`${group.latestMonth?.month ?? "This month"} · ${moneyPerPeriod(group.totals.cashflow, "year", false, group.currency)} total`}
              tone={group.totals.cashflow >= 0 ? "positive" : "warning"}
              icon={<TrendingUp size={20} />}
            />
            <StatCard
              className="p-4"
              label="Net LVR"
              value={percent(group.totals.netLvr, 1)}
              helper={`${compactMoney(group.totals.offset, group.currency)} offset against debt`}
              icon={<Wallet size={20} />}
            />
          </div>

          <section className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Income vs expenses" subtitle={`Rolling 12 months · ${group.currency}`} />
              <CardBody>
                <CashflowChart data={group.monthly} currency={group.currency} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Expense mix" subtitle={`Top categories · ${group.currency}`} />
              <CardBody>
                {group.categoryData.length ? (
                  <>
                    <CategoryDonut data={group.categoryData} currency={group.currency} />
                    <ul className="mt-3 space-y-1.5">
                      {group.categoryData.map((item) => (
                        <li key={item.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-semibold">{money(item.value, false, group.currency)}</span>
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
                subtitle={`Live performance · ${group.currency}`}
                action={
                  <Link href="/properties" className="text-sm font-semibold text-brand">
                    View all
                  </Link>
                }
              />
              <CardBody className="grid gap-3 sm:grid-cols-2">
                {group.metrics.map((metric) => (
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
                        <p className="font-semibold">{compactMoney(metric.valuation, group.currency)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted">Equity</p>
                        <p className="font-semibold text-positive">{compactMoney(metric.equity, group.currency)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted">LVR</p>
                        <p className="font-semibold">{percent(metric.lvr, 1)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted">Cashflow / year</p>
                        <p className={metric.cashflow >= 0 ? "font-semibold text-positive" : "font-semibold text-negative"}>
                          {compactMoneyPerPeriod(metric.cashflow, "year", group.currency)}
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
                <CardHeader title="Net cashflow / month" subtitle="Rolling 12 months" />
                <CardBody>
                  <EquityTrend data={group.monthly} currency={group.currency} />
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Rent collected" subtitle="All time" />
                <CardBody className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <Wallet size={16} /> {group.incomeEntries} entries
                  </span>
                  <span className="text-xl font-bold">{money(group.totals.income, false, group.currency)}</span>
                </CardBody>
              </Card>
            </div>
          </section>
        </section>
      ))}

      <PropertyForm open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
