"use client";

import * as React from "react";
import { db, nowIso, uid } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Select, Textarea, Toggle } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { accentPalette, australianStates, currencies, propertyStatuses, propertyTypes, rentFrequencies } from "@/lib/options";
import { titleise, todayIso, money, cn } from "@/lib/format";
import {
  currentFinancialYear,
  financialYearLabel,
  managementFeeFor,
  rentAmountPerPeriod,
  rentPeriodsInFinancialYear,
  totalCapitalRequired
} from "@/lib/calc";
import type { CurrencyCode, IncomeEntry, Loan, Property, PurchaseDetails, PropertyTaxTreatment, RentFrequency } from "@/lib/types";

const emptyProperty = (): Property => ({
  id: uid(),
  name: "",
  address: "",
  suburb: "",
  state: "QLD",
  postcode: "",
  country: "Australia",
  type: "house",
  status: "owned",
  bedrooms: 3,
  bathrooms: 2,
  carSpaces: 1,
  landSize: 400,
  currentValuation: 0,
  annualDepreciation: 0,
  managementFeePercent: 5.5,
  managementFeeType: "percent",
  managementFeeFixed: 0,
  annualRent: 0,
  rentFrequency: "monthly",
  currency: "AUD",
  accent: accentPalette[0],
  taxTreatment: "offset",
  archived: false,
  createdAt: nowIso(),
  updatedAt: nowIso()
});

const emptyPurchase = (propertyId: string): PurchaseDetails => ({
  id: uid(),
  propertyId,
  purchaseDate: todayIso(),
  valuation: 0,
  purchasePrice: 0,
  loanBeforeLmi: 0,
  lmi: 0,
  loanAfterLmi: 0,
  deposit: 0,
  stampDuty: 0,
  legalFees: 0,
  renovations: 0,
  settlementFees: 0,
  buildingAndPest: 0,
  registrationFees: 0,
  otherCosts: 0,
  updatedAt: nowIso()
});

const emptyLoan = (propertyId: string): Loan => ({
  id: uid(),
  propertyId,
  bank: "",
  accountName: "",
  loanBalance: 0,
  offsetBalance: 0,
  interestRate: 6.1,
  repaymentType: "interest-only",
  interestOnlyMonths: 60,
  principalAndInterestMonths: 300,
  repaymentFrequency: "monthly",
  startDate: todayIso(),
  updatedAt: nowIso()
});

const steps = ["Property", "Purchase", "Finance"] as const;

function periodsPerYear(frequency: RentFrequency): number {
  return frequency === "weekly" ? 52 : frequency === "fortnightly" ? 26 : 12;
}

/** Fills in any periods of the current FY that don't already have a rent record, so new schedules show up as pending. */
async function generatePendingRentSchedule(property: Property): Promise<void> {
  const periods = rentPeriodsInFinancialYear(property.rentFrequency, currentFinancialYear());
  const existing = await db.income
    .where("propertyId")
    .equals(property.id)
    .and((entry) => entry.category === "rent")
    .toArray();
  const existingStarts = new Set(existing.map((entry) => entry.periodStart));
  const missing = periods.filter((period) => !existingStarts.has(period.start));
  if (!missing.length) return;

  const stamp = nowIso();
  const amount = rentAmountPerPeriod(property);
  await db.income.bulkAdd(
    missing.map((period): IncomeEntry => ({
      id: uid(),
      propertyId: property.id,
      date: period.end,
      periodStart: period.start,
      periodEnd: period.end,
      category: "rent",
      status: "pending",
      amount,
      managementFee: managementFeeFor(property, amount),
      createdAt: stamp,
      updatedAt: stamp
    }))
  );
}

export function PropertyForm({
  open,
  onClose,
  propertyId
}: {
  open: boolean;
  onClose: () => void;
  propertyId?: string;
}) {
  const toast = useToast();
  const [step, setStep] = React.useState(0);
  const [property, setProperty] = React.useState<Property>(emptyProperty);
  const [purchase, setPurchase] = React.useState<PurchaseDetails>(() => emptyPurchase(property.id));
  const [loan, setLoan] = React.useState<Loan>(() => emptyLoan(property.id));
  const [knowsRent, setKnowsRent] = React.useState(false);
  const fy = currentFinancialYear();

  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    (async () => {
      if (propertyId) {
        const [existing, existingPurchase, existingLoan] = await Promise.all([
          db.properties.get(propertyId),
          db.purchases.where("propertyId").equals(propertyId).first(),
          db.loans.where("propertyId").equals(propertyId).first()
        ]);
        if (existing) setProperty(existing);
        setPurchase(existingPurchase ?? emptyPurchase(propertyId));
        setLoan(existingLoan ?? emptyLoan(propertyId));
        setKnowsRent(Boolean(existing?.annualRent));
      } else {
        const fresh = emptyProperty();
        setProperty(fresh);
        setPurchase(emptyPurchase(fresh.id));
        setLoan(emptyLoan(fresh.id));
        setKnowsRent(false);
      }
    })();
  }, [open, propertyId]);

  const patchProperty = (patch: Partial<Property>) => setProperty((current) => ({ ...current, ...patch }));
  const patchPurchase = (patch: Partial<PurchaseDetails>) => setPurchase((current) => ({ ...current, ...patch }));
  const patchLoan = (patch: Partial<Loan>) => setLoan((current) => ({ ...current, ...patch }));

  const save = async () => {
    if (!property.name.trim()) {
      toast("Give the property a name first", "error");
      setStep(0);
      return;
    }
    const stamp = nowIso();
    const finalProperty: Property = {
      ...property,
      currentValuation: property.currentValuation || purchase.valuation || purchase.purchasePrice,
      annualRent: knowsRent ? property.annualRent : 0,
      updatedAt: stamp
    };
    await db.transaction("rw", [db.properties, db.purchases, db.loans], async () => {
      await db.properties.put(finalProperty);
      await db.purchases.put({ ...purchase, propertyId: property.id, updatedAt: stamp });
      await db.loans.put({ ...loan, propertyId: property.id, updatedAt: stamp });
    });
    if (knowsRent && finalProperty.annualRent > 0) await generatePendingRentSchedule(finalProperty);
    toast(propertyId ? "Property updated" : "Property added to portfolio");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={propertyId ? "Edit property" : "Add property"}
      description="Capture the asset, acquisition costs and loan structure."
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {steps.map((label, index) => (
              <button
                key={label}
                onClick={() => setStep(index)}
                className={cn(
                  "h-1.5 w-10 rounded-full transition-colors",
                  index <= step ? "bg-brand" : "bg-muted/30"
                )}
                aria-label={label}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : null}
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
            ) : (
              <Button onClick={save}>Save property</Button>
            )}
          </div>
        </div>
      }
    >
      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Property name" className="sm:col-span-2">
            <Input
              value={property.name}
              placeholder="e.g. 12 Marina Street"
              onChange={(event) => patchProperty({ name: event.target.value })}
            />
          </Field>
          <Field label="Street address" className="sm:col-span-2">
            <Input value={property.address} onChange={(event) => patchProperty({ address: event.target.value })} />
          </Field>
          <Field label="Suburb">
            <Input value={property.suburb} onChange={(event) => patchProperty({ suburb: event.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State">
              <Select value={property.state} onChange={(event) => patchProperty({ state: event.target.value })}>
                {australianStates.map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </Select>
            </Field>
            <Field label="Postcode">
              <Input value={property.postcode} onChange={(event) => patchProperty({ postcode: event.target.value })} />
            </Field>
          </div>
          <Field label="Type">
            <Select
              value={property.type}
              onChange={(event) => patchProperty({ type: event.target.value as Property["type"] })}
            >
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {titleise(type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={property.status}
              onChange={(event) => patchProperty({ status: event.target.value as Property["status"] })}
            >
              {propertyStatuses.map((status) => (
                <option key={status} value={status}>
                  {titleise(status)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-4 gap-3 sm:col-span-2">
            <Field label="Beds">
              <Input
                type="number"
                value={property.bedrooms}
                onChange={(event) => patchProperty({ bedrooms: Number(event.target.value) })}
              />
            </Field>
            <Field label="Baths">
              <Input
                type="number"
                value={property.bathrooms}
                onChange={(event) => patchProperty({ bathrooms: Number(event.target.value) })}
              />
            </Field>
            <Field label="Cars">
              <Input
                type="number"
                value={property.carSpaces}
                onChange={(event) => patchProperty({ carSpaces: Number(event.target.value) })}
              />
            </Field>
            <Field label="Land m²">
              <Input
                type="number"
                value={property.landSize}
                onChange={(event) => patchProperty({ landSize: Number(event.target.value) })}
              />
            </Field>
          </div>
          <Field label="Current valuation">
            <MoneyInput
              value={property.currentValuation}
              currency={property.currency}
              onValueChange={(value) => patchProperty({ currentValuation: value })}
            />
          </Field>
          <Field label="Currency">
            <Select value={property.currency} onChange={(event) => patchProperty({ currency: event.target.value as CurrencyCode })}>
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Valuation date">
            <Input
              type="date"
              value={property.valuationDate ?? ""}
              onChange={(event) => patchProperty({ valuationDate: event.target.value })}
            />
          </Field>
          <Field label="Yearly depreciation" hint="Annual non-cash depreciation used in net cashflow.">
            <MoneyInput
              value={property.annualDepreciation}
              currency={property.currency}
              onValueChange={(value) => patchProperty({ annualDepreciation: value })}
            />
          </Field>
          <Field label="Estimated rent" className="sm:col-span-2">
            <Toggle
              checked={knowsRent}
              onChange={setKnowsRent}
              label={`Do you know the estimated rent for ${financialYearLabel(fy)}?`}
            />
          </Field>
          {knowsRent ? (
            <>
              <Field label="Rent frequency">
                <Select
                  value={property.rentFrequency}
                  onChange={(event) => patchProperty({ rentFrequency: event.target.value as RentFrequency })}
                >
                  {rentFrequencies.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {titleise(frequency)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={`Rent per ${property.rentFrequency.replace("ly", "")}`}
                hint={`Generates pending ${financialYearLabel(fy)} rent entries you mark as paid when received.`}
              >
                <MoneyInput
                  value={rentAmountPerPeriod(property)}
                  currency={property.currency}
                  onValueChange={(value) =>
                    patchProperty({ annualRent: Math.round(value * periodsPerYear(property.rentFrequency) * 100) / 100 })
                  }
                />
              </Field>
              <Field label="Management fee" hint="Percentage of rent, or a flat fee per period." className="sm:col-span-2">
                <div className="space-y-2">
                  <div className="flex max-w-xs gap-1 rounded-xl border border-border bg-bg/50 p-1">
                    {(
                      [
                        ["percent", "%"],
                        ["fixed", "$"]
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => patchProperty({ managementFeeType: mode })}
                        className={cn(
                          "flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                          property.managementFeeType === mode ? "bg-brand text-white" : "text-muted hover:text-fg"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {property.managementFeeType === "fixed" ? (
                    <MoneyInput
                      value={property.managementFeeFixed}
                      currency={property.currency}
                      onValueChange={(value) => patchProperty({ managementFeeFixed: value })}
                    />
                  ) : (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={property.managementFeePercent}
                      onChange={(event) => patchProperty({ managementFeePercent: Number(event.target.value) })}
                    />
                  )}
                </div>
              </Field>
            </>
          ) : null}
          <Field
            label="Gearing treatment"
            hint="A loss can offset your other income, or be held within this property per current negative-gearing rules."
          >
            <Select
              value={property.taxTreatment}
              onChange={(event) => patchProperty({ taxTreatment: event.target.value as PropertyTaxTreatment })}
            >
              <option value="offset">Offset loss against other income</option>
              <option value="retain">Hold loss within property</option>
            </Select>
          </Field>
          <Field label="Accent colour" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {accentPalette.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  onClick={() => patchProperty({ accent: colour })}
                  style={{ backgroundColor: colour }}
                  className={cn(
                    "h-9 w-9 rounded-xl transition",
                    property.accent === colour ? "ring-4 ring-brand/30" : "opacity-70 hover:opacity-100"
                  )}
                  aria-label={colour}
                />
              ))}
            </div>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={property.notes ?? ""} onChange={(event) => patchProperty({ notes: event.target.value })} />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Purchase date">
            <Input
              type="date"
              value={purchase.purchaseDate}
              onChange={(event) => patchPurchase({ purchaseDate: event.target.value })}
            />
          </Field>
          <Field label="Settlement date">
            <Input
              type="date"
              value={purchase.settlementDate ?? ""}
              onChange={(event) => patchPurchase({ settlementDate: event.target.value })}
            />
          </Field>
          <Field label="Valuation">
            <MoneyInput value={purchase.valuation} currency={property.currency} onValueChange={(value) => patchPurchase({ valuation: value })} />
          </Field>
          <Field label="Purchase price">
            <MoneyInput
              value={purchase.purchasePrice}
              currency={property.currency}
              onValueChange={(value) => patchPurchase({ purchasePrice: value })}
            />
          </Field>
          <Field label="Loan before LMI">
            <MoneyInput
              value={purchase.loanBeforeLmi}
              currency={property.currency}
              onValueChange={(value) => patchPurchase({ loanBeforeLmi: value, loanAfterLmi: value + purchase.lmi })}
            />
          </Field>
          <Field label="LMI">
            <MoneyInput
              value={purchase.lmi}
              currency={property.currency}
              onValueChange={(value) => patchPurchase({ lmi: value, loanAfterLmi: purchase.loanBeforeLmi + value })}
            />
          </Field>
          <Field label="Loan after LMI">
            <MoneyInput value={purchase.loanAfterLmi} currency={property.currency} onValueChange={(value) => patchPurchase({ loanAfterLmi: value })} />
          </Field>
          <Field label="Deposit">
            <MoneyInput value={purchase.deposit} currency={property.currency} onValueChange={(value) => patchPurchase({ deposit: value })} />
          </Field>
          <Field label="Stamp duty">
            <MoneyInput value={purchase.stampDuty} currency={property.currency} onValueChange={(value) => patchPurchase({ stampDuty: value })} />
          </Field>
          <Field label="Legal fees">
            <MoneyInput value={purchase.legalFees} currency={property.currency} onValueChange={(value) => patchPurchase({ legalFees: value })} />
          </Field>
          <Field label="Renovations">
            <MoneyInput value={purchase.renovations} currency={property.currency} onValueChange={(value) => patchPurchase({ renovations: value })} />
          </Field>
          <Field label="Settlement fees">
            <MoneyInput
              value={purchase.settlementFees}
              currency={property.currency}
              onValueChange={(value) => patchPurchase({ settlementFees: value })}
            />
          </Field>
          <Field label="Building & pest">
            <MoneyInput
              value={purchase.buildingAndPest}
              currency={property.currency}
              onValueChange={(value) => patchPurchase({ buildingAndPest: value })}
            />
          </Field>
          <Field label="Registration fees">
            <MoneyInput
              value={purchase.registrationFees}
              currency={property.currency}
              onValueChange={(value) => patchPurchase({ registrationFees: value })}
            />
          </Field>
          <Field label="Other costs">
            <MoneyInput value={purchase.otherCosts} currency={property.currency} onValueChange={(value) => patchPurchase({ otherCosts: value })} />
          </Field>
          <div className="flex items-center justify-between rounded-2xl border border-brand/30 bg-brand/10 px-4 py-3 sm:col-span-2">
            <span className="text-sm font-medium">Total capital required</span>
            <span className="text-lg font-bold">{money(totalCapitalRequired(purchase, loan), false, property.currency)}</span>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank / lender">
            <Input value={loan.bank} onChange={(event) => patchLoan({ bank: event.target.value })} />
          </Field>
          <Field label="Account name">
            <Input value={loan.accountName} onChange={(event) => patchLoan({ accountName: event.target.value })} />
          </Field>
          <Field label="Loan balance">
            <MoneyInput value={loan.loanBalance} currency={property.currency} onValueChange={(value) => patchLoan({ loanBalance: value })} />
          </Field>
          <Field label="Offset balance">
            <MoneyInput value={loan.offsetBalance} currency={property.currency} onValueChange={(value) => patchLoan({ offsetBalance: value })} />
          </Field>
          <Field label="Interest rate %">
            <Input
              type="number"
              step="0.01"
              value={loan.interestRate}
              onChange={(event) => patchLoan({ interestRate: Number(event.target.value) })}
            />
          </Field>
          <Field label="Repayment type">
            <Select
              value={loan.repaymentType}
              onChange={(event) => patchLoan({ repaymentType: event.target.value as Loan["repaymentType"] })}
            >
              <option value="interest-only">Interest only</option>
              <option value="principal-and-interest">Principal &amp; interest</option>
            </Select>
          </Field>
          <Field label="Interest only (months)">
            <Input
              type="number"
              value={loan.interestOnlyMonths}
              onChange={(event) => patchLoan({ interestOnlyMonths: Number(event.target.value) })}
            />
          </Field>
          <Field label="P&I term (months)">
            <Input
              type="number"
              value={loan.principalAndInterestMonths}
              onChange={(event) => patchLoan({ principalAndInterestMonths: Number(event.target.value) })}
            />
          </Field>
          <Field label="Repayment frequency">
            <Select
              value={loan.repaymentFrequency}
              onChange={(event) =>
                patchLoan({ repaymentFrequency: event.target.value as Loan["repaymentFrequency"] })
              }
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
          <Field label="Fixed until">
            <Input
              type="date"
              value={loan.fixedUntil ?? ""}
              onChange={(event) => patchLoan({ fixedUntil: event.target.value })}
            />
          </Field>
        </div>
      ) : null}
    </Modal>
  );
}
