"use client";

import * as React from "react";
import { db, nowIso, uid } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { accentPalette, australianStates, propertyStatuses, propertyTypes } from "@/lib/options";
import { titleise, todayIso, money, cn } from "@/lib/format";
import { totalCapitalRequired } from "@/lib/calc";
import type { Loan, Property, PurchaseDetails, PropertyTaxTreatment } from "@/lib/types";

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
      } else {
        const fresh = emptyProperty();
        setProperty(fresh);
        setPurchase(emptyPurchase(fresh.id));
        setLoan(emptyLoan(fresh.id));
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
    await db.transaction("rw", [db.properties, db.purchases, db.loans], async () => {
      await db.properties.put({
        ...property,
        currentValuation: property.currentValuation || purchase.valuation || purchase.purchasePrice,
        updatedAt: stamp
      });
      await db.purchases.put({ ...purchase, propertyId: property.id, updatedAt: stamp });
      await db.loans.put({ ...loan, propertyId: property.id, updatedAt: stamp });
    });
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
              onValueChange={(value) => patchProperty({ currentValuation: value })}
            />
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
              onValueChange={(value) => patchProperty({ annualDepreciation: value })}
            />
          </Field>
          <Field label="Tax treatment" hint="Choose where this property's profit or loss is reported.">
            <Select
              value={property.taxTreatment}
              onChange={(event) => patchProperty({ taxTreatment: event.target.value as PropertyTaxTreatment })}
            >
              <option value="offset">Offset against tax</option>
              <option value="retain">Hold within property</option>
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
            <MoneyInput value={purchase.valuation} onValueChange={(value) => patchPurchase({ valuation: value })} />
          </Field>
          <Field label="Purchase price">
            <MoneyInput
              value={purchase.purchasePrice}
              onValueChange={(value) => patchPurchase({ purchasePrice: value })}
            />
          </Field>
          <Field label="Loan before LMI">
            <MoneyInput
              value={purchase.loanBeforeLmi}
              onValueChange={(value) => patchPurchase({ loanBeforeLmi: value, loanAfterLmi: value + purchase.lmi })}
            />
          </Field>
          <Field label="LMI">
            <MoneyInput
              value={purchase.lmi}
              onValueChange={(value) => patchPurchase({ lmi: value, loanAfterLmi: purchase.loanBeforeLmi + value })}
            />
          </Field>
          <Field label="Loan after LMI">
            <MoneyInput value={purchase.loanAfterLmi} onValueChange={(value) => patchPurchase({ loanAfterLmi: value })} />
          </Field>
          <Field label="Deposit">
            <MoneyInput value={purchase.deposit} onValueChange={(value) => patchPurchase({ deposit: value })} />
          </Field>
          <Field label="Stamp duty">
            <MoneyInput value={purchase.stampDuty} onValueChange={(value) => patchPurchase({ stampDuty: value })} />
          </Field>
          <Field label="Legal fees">
            <MoneyInput value={purchase.legalFees} onValueChange={(value) => patchPurchase({ legalFees: value })} />
          </Field>
          <Field label="Renovations">
            <MoneyInput value={purchase.renovations} onValueChange={(value) => patchPurchase({ renovations: value })} />
          </Field>
          <Field label="Settlement fees">
            <MoneyInput
              value={purchase.settlementFees}
              onValueChange={(value) => patchPurchase({ settlementFees: value })}
            />
          </Field>
          <Field label="Building & pest">
            <MoneyInput
              value={purchase.buildingAndPest}
              onValueChange={(value) => patchPurchase({ buildingAndPest: value })}
            />
          </Field>
          <Field label="Registration fees">
            <MoneyInput
              value={purchase.registrationFees}
              onValueChange={(value) => patchPurchase({ registrationFees: value })}
            />
          </Field>
          <Field label="Other costs">
            <MoneyInput value={purchase.otherCosts} onValueChange={(value) => patchPurchase({ otherCosts: value })} />
          </Field>
          <div className="flex items-center justify-between rounded-2xl border border-brand/30 bg-brand/10 px-4 py-3 sm:col-span-2">
            <span className="text-sm font-medium">Total capital required</span>
            <span className="text-lg font-bold">{money(totalCapitalRequired(purchase, loan))}</span>
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
            <MoneyInput value={loan.loanBalance} onValueChange={(value) => patchLoan({ loanBalance: value })} />
          </Field>
          <Field label="Offset balance">
            <MoneyInput value={loan.offsetBalance} onValueChange={(value) => patchLoan({ offsetBalance: value })} />
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
