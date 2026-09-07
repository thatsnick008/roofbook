"use client";

import * as React from "react";
import { db, nowIso, uid } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useProperties } from "@/hooks/useData";
import { incomeCategories, incomeStatuses } from "@/lib/options";
import { titleise, todayIso, money } from "@/lib/format";
import type { IncomeEntry, Property } from "@/lib/types";

export function IncomeForm({
  open,
  onClose,
  entry,
  defaultPropertyId
}: {
  open: boolean;
  onClose: () => void;
  entry?: IncomeEntry;
  defaultPropertyId?: string;
}) {
  const toast = useToast();
  const properties = useProperties() ?? [];
  const [form, setForm] = React.useState<IncomeEntry>(() => blank(defaultPropertyId));
  const [feeMode, setFeeMode] = React.useState<"percent" | "amount">("percent");
  const [feePercent, setFeePercent] = React.useState(5.5);
  const selectedProperty = properties.find((property) => property.id === form.propertyId);

  React.useEffect(() => {
    if (!open) return;
    const property = properties.find((item) => item.id === (defaultPropertyId ?? properties[0]?.id));
    setForm(entry ?? blank(defaultPropertyId ?? properties[0]?.id, property));
    setFeeMode("percent");
    setFeePercent(
      entry && entry.amount > 0
        ? Math.round((entry.managementFee / entry.amount) * 1000) / 10
        : property?.managementFeePercent ?? 5.5
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, defaultPropertyId]);

  const patch = (value: Partial<IncomeEntry>) => setForm((current) => ({ ...current, ...value }));

  React.useEffect(() => {
    if (feeMode !== "percent") return;
    const fee = Math.round(form.amount * (feePercent / 100) * 100) / 100;
    if (fee !== form.managementFee) patch({ managementFee: fee });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeMode, feePercent, form.amount]);

  const selectProperty = (propertyId: string) => {
    patch({ propertyId });
    if (feeMode === "percent") {
      const property = properties.find((item) => item.id === propertyId);
      setFeePercent(property?.managementFeePercent ?? 5.5);
      if (!entry && property?.annualRent) {
        const amount = rentAmount(property);
        patch({ amount, managementFee: Math.round(amount * ((property.managementFeePercent ?? 0) / 100) * 100) / 100 });
      }
    }
  };

  const save = async () => {
    if (!form.propertyId) {
      toast("Select a property", "error");
      return;
    }
    await db.income.put(form);
    toast(entry ? "Income updated" : "Income recorded");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? "Edit income" : "Record income"}
      description="Rent payments, arrears recovery or other property income."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Property" className="sm:col-span-2">
          <Select value={form.propertyId} onChange={(event) => selectProperty(event.target.value)}>
            <option value="">Select property…</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date received">
          <Input type="date" value={form.date} onChange={(event) => patch({ date: event.target.value })} />
        </Field>
        <Field label="Category">
          <Select
            value={form.category}
            onChange={(event) => patch({ category: event.target.value as IncomeEntry["category"] })}
          >
            {incomeCategories.map((category) => (
              <option key={category} value={category}>
                {titleise(category)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Period start">
          <Input
            type="date"
            value={form.periodStart ?? ""}
            onChange={(event) => patch({ periodStart: event.target.value })}
          />
        </Field>
        <Field label="Period end">
          <Input
            type="date"
            value={form.periodEnd ?? ""}
            onChange={(event) => patch({ periodEnd: event.target.value })}
          />
        </Field>
        <Field label="Amount">
          <MoneyInput value={form.amount} currency={selectedProperty?.currency} onValueChange={(value) => patch({ amount: value })} />
        </Field>
        <Field label="Management fee">
          <div className="space-y-2">
            <div className="flex gap-1 rounded-xl border border-border bg-bg/50 p-1">
              {(
                [
                  ["percent", "%"],
                  ["amount", "$"]
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFeeMode(mode)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    feeMode === mode ? "bg-brand text-white" : "text-muted hover:text-fg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {feeMode === "percent" ? (
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={feePercent}
                  onChange={(event) => setFeePercent(Number(event.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted">= {money(form.managementFee, true, selectedProperty?.currency)}</span>
              </div>
            ) : (
              <MoneyInput value={form.managementFee} currency={selectedProperty?.currency} onValueChange={(value) => patch({ managementFee: value })} />
            )}
          </div>
        </Field>
        <Field label="Status" className="sm:col-span-2">
          <Select
            value={form.status}
            onChange={(event) => patch({ status: event.target.value as IncomeEntry["status"] })}
          >
            {incomeStatuses.map((status) => (
              <option key={status} value={status}>
                {titleise(status)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes ?? ""} onChange={(event) => patch({ notes: event.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function rentAmount(property?: Property): number {
  if (!property?.annualRent) return 0;
  const divisor = property.rentFrequency === "weekly" ? 52 : property.rentFrequency === "fortnightly" ? 26 : 12;
  return Math.round((property.annualRent / divisor) * 100) / 100;
}

function blank(propertyId?: string, property?: Property): IncomeEntry {
  const amount = rentAmount(property);
  return {
    id: uid(),
    propertyId: propertyId ?? "",
    date: todayIso(),
    category: "rent",
    status: "received",
    amount,
    managementFee: property ? Math.round(amount * ((property.managementFeePercent ?? 0) / 100) * 100) / 100 : 0,
    createdAt: nowIso()
  };
}
