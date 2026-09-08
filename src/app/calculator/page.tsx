"use client";

import * as React from "react";
import { Calculator, Layers, PiggyBank, Receipt, TrendingUp } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Primitives";
import { StatCard } from "@/components/ui/StatCard";
import { Field, Input, MoneyInput, Select } from "@/components/ui/Field";
import { usePortfolio } from "@/hooks/useData";
import { useCurrencyFilter } from "@/components/providers/CurrencyProvider";
import { estimateProperty, stateLookup, stateLookups, suburbsForState, type CalculatorInput } from "@/lib/lookups";
import { propertyTypes } from "@/lib/options";
import { money, percent, titleise } from "@/lib/format";
import type { CurrencyCode, PropertyType } from "@/lib/types";

const DEFAULTS: CalculatorInput = {
  state: "QLD",
  suburb: "",
  price: 750_000,
  annualRent: 33_800,
  propertyType: "house",
  lvr: 80,
  interestRate: 6.2,
  vacancyWeeks: 2,
  maintenancePercent: 5
};

export default function CalculatorPage() {
  const { currency } = useCurrencyFilter();
  const { metrics } = usePortfolio();
  const [input, setInput] = React.useState<CalculatorInput>(DEFAULTS);

  const displayCurrency: CurrencyCode = currency;
  const suburbs = suburbsForState(input.state);
  const result = React.useMemo(() => estimateProperty(input), [input]);

  const patch = (values: Partial<CalculatorInput>) => setInput((current) => ({ ...current, ...values }));

  const applyYield = (value: number) => patch({ annualRent: Math.round((input.price * value) / 100) });

  const selectSuburb = (name: string) => {
    const match = suburbs.find((entry) => entry.suburb === name);
    if (!match) {
      patch({ suburb: name });
      return;
    }
    patch({ suburb: name, price: match.medianPrice, annualRent: match.weeklyRent * 52 });
  };

  const selectState = (code: string) => {
    const lookup = stateLookup(code);
    patch({ state: code, suburb: "", annualRent: Math.round((input.price * lookup.typicalGrossYield) / 100) });
  };

  const portfolio = React.useMemo(() => {
    const totals = metrics.reduce(
      (acc, metric) => ({
        valuation: acc.valuation + metric.valuation,
        debt: acc.debt + metric.debt,
        income: acc.income + metric.income,
        expenses: acc.expenses + metric.expenses,
        interest: acc.interest + metric.interest,
        capitalRequired: acc.capitalRequired + metric.capitalRequired
      }),
      { valuation: 0, debt: 0, income: 0, expenses: 0, interest: 0, capitalRequired: 0 }
    );
    return { ...totals, count: metrics.length };
  }, [metrics]);

  const cumulative = {
    count: portfolio.count + 1,
    valuation: portfolio.valuation + input.price,
    debt: portfolio.debt + result.loan,
    income: portfolio.income + input.annualRent,
    expenses: portfolio.expenses + result.operatingTotal,
    interest: portfolio.interest + result.interest,
    capitalRequired: portfolio.capitalRequired + result.cashRequired
  };
  const cumulativeCashflow = cumulative.income - cumulative.expenses - cumulative.interest;
  const portfolioCashflow = portfolio.income - portfolio.expenses - portfolio.interest;

  return (
    <>
      <PageHeader
        title="Acquisition calculator"
        subtitle="Estimate purchase and holding costs for a prospective property, then see the portfolio impact."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader title="Deal inputs" subtitle="State and suburb drive the pre-populated lookups" />
          <CardBody className="grid gap-4">
            <Field label="State">
              <Select value={input.state} onChange={(event) => selectState(event.target.value)}>
                {stateLookups.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.code} — {entry.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Suburb" hint="Choosing a listed suburb pre-fills median price and rent.">
              <Select value={suburbs.some((entry) => entry.suburb === input.suburb) ? input.suburb : ""} onChange={(event) => selectSuburb(event.target.value)}>
                <option value="">Not listed — enter values manually</option>
                {suburbs.map((entry) => (
                  <option key={entry.suburb} value={entry.suburb}>
                    {entry.suburb} {entry.postcode}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Property type">
              <Select
                value={input.propertyType}
                onChange={(event) => patch({ propertyType: event.target.value as PropertyType })}
              >
                {propertyTypes.map((type) => (
                  <option key={type} value={type}>
                    {titleise(type)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Expected purchase price">
              <MoneyInput
                value={input.price}
                currency={displayCurrency}
                onValueChange={(value) => patch({ price: value })}
              />
            </Field>

            <Field label="Expected annual rent">
              <MoneyInput
                value={input.annualRent}
                currency={displayCurrency}
                onValueChange={(value) => patch({ annualRent: value })}
              />
            </Field>

            <Field label="Gross yield %" hint="Editing the yield recalculates the expected rent.">
              <Input
                type="number"
                step="0.1"
                value={result.grossYield.toFixed(2)}
                onChange={(event) => applyYield(Number(event.target.value))}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="LVR %">
                <Input
                  type="number"
                  step="1"
                  min={0}
                  max={100}
                  value={input.lvr}
                  onChange={(event) => patch({ lvr: Number(event.target.value) })}
                />
              </Field>
              <Field label="Interest rate %">
                <Input
                  type="number"
                  step="0.05"
                  value={input.interestRate}
                  onChange={(event) => patch({ interestRate: Number(event.target.value) })}
                />
              </Field>
              <Field label="Vacancy (weeks/yr)">
                <Input
                  type="number"
                  step="1"
                  min={0}
                  max={52}
                  value={input.vacancyWeeks}
                  onChange={(event) => patch({ vacancyWeeks: Number(event.target.value) })}
                />
              </Field>
              <Field label="Maintenance % of rent">
                <Input
                  type="number"
                  step="0.5"
                  min={0}
                  value={input.maintenancePercent}
                  onChange={(event) => patch({ maintenancePercent: Number(event.target.value) })}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Cash required"
              value={money(result.cashRequired, false, displayCurrency)}
              helper={`Deposit ${money(result.deposit, false, displayCurrency)} + costs`}
              icon={<PiggyBank size={18} />}
            />
            <StatCard
              label="Annual holding costs"
              value={money(result.operatingTotal, false, displayCurrency)}
              helper={`Plus ${money(result.interest, false, displayCurrency)} interest`}
              tone="warning"
              icon={<Receipt size={18} />}
            />
            <StatCard
              label="Net yield"
              value={percent(result.netYield)}
              helper={`Gross ${percent(result.grossYield)}`}
              tone="positive"
              icon={<TrendingUp size={18} />}
            />
            <StatCard
              label="Cashflow after interest"
              value={money(result.cashflowAfterInterest, false, displayCurrency)}
              helper={`Cash on cash ${percent(result.cashOnCash)}`}
              tone={result.cashflowAfterInterest >= 0 ? "positive" : "negative"}
              icon={<Calculator size={18} />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Upfront costs" subtitle={`${stateLookup(input.state).label} lookup values`} />
              <CardBody className="space-y-1">
                <CostRow label="Deposit" amount={result.deposit} currency={displayCurrency} />
                {result.upfront.map((line) => (
                  <CostRow key={line.label} label={line.label} note={line.note} amount={line.amount} currency={displayCurrency} />
                ))}
                <CostRow label="Total cash required" amount={result.cashRequired} currency={displayCurrency} emphasis />
                <p className="pt-2 text-xs text-muted">
                  Loan drawn {money(result.loan, false, displayCurrency)}. LMI is assumed capitalised into the loan.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Annual operating costs" subtitle="Before loan interest and depreciation" />
              <CardBody className="space-y-1">
                {result.operating.map((line) => (
                  <CostRow key={line.label} label={line.label} note={line.note} amount={line.amount} currency={displayCurrency} />
                ))}
                <CostRow label="Total operating costs" amount={result.operatingTotal} currency={displayCurrency} emphasis />
                <CostRow label="Loan interest" amount={result.interest} currency={displayCurrency} />
                <CostRow
                  label="Net cashflow"
                  amount={result.cashflowAfterInterest}
                  currency={displayCurrency}
                  emphasis
                />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Cumulative portfolio impact"
              subtitle={`Existing ${currency} properties only`}
              action={<Layers size={18} className="text-muted" />}
            />
            <CardBody className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="pb-2 font-semibold">Measure</th>
                    <th className="pb-2 text-right font-semibold">Current ({portfolio.count})</th>
                    <th className="pb-2 text-right font-semibold">This deal</th>
                    <th className="pb-2 text-right font-semibold">Combined ({cumulative.count})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <ComparisonRow
                    label="Portfolio value"
                    current={portfolio.valuation}
                    deal={input.price}
                    combined={cumulative.valuation}
                    currency={displayCurrency}
                  />
                  <ComparisonRow
                    label="Debt"
                    current={portfolio.debt}
                    deal={result.loan}
                    combined={cumulative.debt}
                    currency={displayCurrency}
                  />
                  <ComparisonRow
                    label="Capital deployed"
                    current={portfolio.capitalRequired}
                    deal={result.cashRequired}
                    combined={cumulative.capitalRequired}
                    currency={displayCurrency}
                  />
                  <ComparisonRow
                    label="Gross income"
                    current={portfolio.income}
                    deal={input.annualRent}
                    combined={cumulative.income}
                    currency={displayCurrency}
                  />
                  <ComparisonRow
                    label="Operating costs"
                    current={portfolio.expenses}
                    deal={result.operatingTotal}
                    combined={cumulative.expenses}
                    currency={displayCurrency}
                  />
                  <ComparisonRow
                    label="Loan interest"
                    current={portfolio.interest}
                    deal={result.interest}
                    combined={cumulative.interest}
                    currency={displayCurrency}
                  />
                  <ComparisonRow
                    label="Net cashflow"
                    current={portfolioCashflow}
                    deal={result.cashflowAfterInterest}
                    combined={cumulativeCashflow}
                    currency={displayCurrency}
                    emphasis
                  />
                </tbody>
              </table>
              <p className="pt-3 text-xs text-muted">
                Lookup values are planning estimates. Confirm duty, land tax and levies with the relevant revenue office
                and body corporate before committing.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function CostRow({
  label,
  note,
  amount,
  currency,
  emphasis
}: {
  label: string;
  note?: string;
  amount: number;
  currency: CurrencyCode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "flex items-baseline justify-between gap-3 border-t border-border pt-2 text-sm font-semibold"
          : "flex items-baseline justify-between gap-3 py-1 text-sm"
      }
    >
      <span className={emphasis ? "" : "text-muted"}>
        {label}
        {note ? <span className="ml-1.5 text-xs text-muted">({note})</span> : null}
      </span>
      <span className="tabular-nums">{money(amount, false, currency)}</span>
    </div>
  );
}

function ComparisonRow({
  label,
  current,
  deal,
  combined,
  currency,
  emphasis
}: {
  label: string;
  current: number;
  deal: number;
  combined: number;
  currency: CurrencyCode;
  emphasis?: boolean;
}) {
  return (
    <tr className={emphasis ? "font-semibold" : undefined}>
      <td className="py-2">{label}</td>
      <td className="py-2 text-right tabular-nums">{money(current, false, currency)}</td>
      <td className="py-2 text-right tabular-nums">{money(deal, false, currency)}</td>
      <td className="py-2 text-right tabular-nums">{money(combined, false, currency)}</td>
    </tr>
  );
}
