"use client";

import * as React from "react";
import { db, nowIso, uid } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useProperties } from "@/hooks/useData";
import { incomeCategories, incomeStatuses } from "@/lib/options";
import { titleise, todayIso } from "@/lib/format";
import type { IncomeEntry } from "@/lib/types";

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

  React.useEffect(() => {
    if (!open) return;
    setForm(entry ?? blank(defaultPropertyId ?? properties[0]?.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, defaultPropertyId]);

  const patch = (value: Partial<IncomeEntry>) => setForm((current) => ({ ...current, ...value }));

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
      description="Fortnightly rent, arrears recovery or other property income."
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
          <Select value={form.propertyId} onChange={(event) => patch({ propertyId: event.target.value })}>
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
          <MoneyInput value={form.amount} onValueChange={(value) => patch({ amount: value })} />
        </Field>
        <Field label="Management fee">
          <MoneyInput value={form.managementFee} onValueChange={(value) => patch({ managementFee: value })} />
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

function blank(propertyId?: string): IncomeEntry {
  return {
    id: uid(),
    propertyId: propertyId ?? "",
    date: todayIso(),
    category: "rent",
    status: "received",
    amount: 0,
    managementFee: 0,
    createdAt: nowIso()
  };
}
