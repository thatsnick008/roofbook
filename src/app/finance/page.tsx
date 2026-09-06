"use client";

import * as React from "react";
import Link from "next/link";
import { Banknote, Download, PiggyBank, Percent } from "lucide-react";
import { db, nowIso } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState, PageHeader } from "@/components/ui/Primitives";
import { Field, Input, MoneyInput } from "@/components/ui/Field";
import { StatCard } from "@/components/ui/StatCard";
import { useLoans, useProperties } from "@/hooks/useData";
import { annualInterestForecast, monthlyRepayment, offsetSavingsPerYear, sum } from "@/lib/calc";
import { money, percent, titleise } from "@/lib/format";
import { exportSingleSheet } from "@/lib/export/excel";
import { useToast } from "@/components/ui/Toast";
import type { Loan } from "@/lib/types";

export default function FinancePage() {
  const toast = useToast();
  const loans = useLoans() ?? [];
  const properties = useProperties() ?? [];
  const [extraOffset, setExtraOffset] = React.useState(0);

  const totalDebt = sum(loans.map((loan) => loan.loanBalance));
  const totalOffset = sum(loans.map((loan) => loan.offsetBalance));
  const interest = sum(loans.map((loan) => annualInterestForecast(loan)));
  const saving = sum(loans.map((loan) => offsetSavingsPerYear(loan)));
  const blendedRate = totalDebt > 0 ? sum(loans.map((loan) => loan.loanBalance * loan.interestRate)) / totalDebt : 0;
  const extraSaving = (extraOffset * blendedRate) / 100;

  const update = async (loan: Loan, patch: Partial<Loan>) => {
    await db.loans.put({ ...loan, ...patch, updatedAt: nowIso() });
  };

  return (
    <>
      <PageHeader
        title="Finance & Offset"
        subtitle="Loan structure, interest forecasting and offset optimisation."
        actions={
          <Button variant="secondary" onClick={() => exportSingleSheet("Finance & Offset")}>
            <Download size={16} /> Export Excel
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total debt" value={money(totalDebt)} tone="negative" icon={<Banknote size={20} />} />
        <StatCard label="Offset balances" value={money(totalOffset)} tone="positive" icon={<PiggyBank size={20} />} />
        <StatCard label="Blended rate" value={percent(blendedRate)} icon={<Percent size={20} />} />
        <StatCard label="Interest forecast" value={money(interest)} helper={`${money(saving)} saved by offset`} tone="warning" />
      </section>

      {loans.length === 0 ? (
        <EmptyState
          icon={<Banknote size={22} />}
          title="No loans yet"
          description="Add a property with loan details to forecast interest and model offset savings."
          action={
            <Link href="/properties">
              <Button>Go to properties</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {loans.map((loan) => {
              const property = properties.find((item) => item.id === loan.propertyId);
              return (
                <Card key={loan.id}>
                  <CardHeader
                    title={property?.name ?? "Unlinked loan"}
                    subtitle={`${loan.bank || "Lender"} · ${titleise(loan.repaymentType)}`}
                    action={
                      <span className="chip">
                        {percent(loan.interestRate)} · {titleise(loan.repaymentFrequency)}
                      </span>
                    }
                  />
                  <CardBody className="grid gap-4 sm:grid-cols-2">
                    <Field label="Loan balance">
                      <MoneyInput value={loan.loanBalance} onValueChange={(value) => update(loan, { loanBalance: value })} />
                    </Field>
                    <Field label="Offset balance">
                      <MoneyInput
                        value={loan.offsetBalance}
                        onValueChange={(value) => update(loan, { offsetBalance: value })}
                      />
                    </Field>
                    <Field label="Interest rate %">
                      <Input
                        type="number"
                        step="0.01"
                        value={loan.interestRate}
                        onChange={(event) => update(loan, { interestRate: Number(event.target.value) })}
                      />
                    </Field>
                    <Field label="Fixed until">
                      <Input
                        type="date"
                        value={loan.fixedUntil ?? ""}
                        onChange={(event) => update(loan, { fixedUntil: event.target.value })}
                      />
                    </Field>
                    <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                      <div className="rounded-xl border border-border bg-bg/50 px-3 py-2.5">
                        <p className="text-[11px] uppercase tracking-wide text-muted">Effective debt</p>
                        <p className="font-semibold">{money(Math.max(loan.loanBalance - loan.offsetBalance, 0))}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-bg/50 px-3 py-2.5">
                        <p className="text-[11px] uppercase tracking-wide text-muted">Repayment / mo</p>
                        <p className="font-semibold">{money(monthlyRepayment(loan))}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-bg/50 px-3 py-2.5">
                        <p className="text-[11px] uppercase tracking-wide text-muted">Interest p.a.</p>
                        <p className="font-semibold text-negative">{money(annualInterestForecast(loan))}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader title="Offset scenario" subtitle="Model additional funds parked in offset" />
            <CardBody className="space-y-4">
              <input
                type="range"
                min={0}
                max={250000}
                step={5000}
                value={extraOffset}
                onChange={(event) => setExtraOffset(Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted/30 accent-brand"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-bg/50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted">Extra in offset</p>
                  <p className="text-lg font-bold">{money(extraOffset)}</p>
                </div>
                <div className="rounded-xl border border-positive/30 bg-positive/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted">Interest saved p.a.</p>
                  <p className="text-lg font-bold text-positive">{money(extraSaving)}</p>
                </div>
                <div className="rounded-xl border border-border bg-bg/50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted">New interest forecast</p>
                  <p className="text-lg font-bold">{money(Math.max(interest - extraSaving, 0))}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setExtraOffset(0);
                  toast("Scenario reset", "info");
                }}
              >
                Reset scenario
              </Button>
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
