"use client";

import * as React from "react";
import { db, nowIso, uid } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Select, Textarea, Toggle } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useProperties } from "@/hooks/useData";
import { expenseCategories } from "@/lib/options";
import { titleise, todayIso } from "@/lib/format";
import type { ExpenseEntry } from "@/lib/types";

export function ExpenseForm({
  open,
  onClose,
  entry,
  defaultPropertyId
}: {
  open: boolean;
  onClose: () => void;
  entry?: ExpenseEntry;
  defaultPropertyId?: string;
}) {
  const toast = useToast();
  const properties = useProperties() ?? [];
  const [form, setForm] = React.useState<ExpenseEntry>(() => blank(defaultPropertyId));

  React.useEffect(() => {
    if (!open) return;
    setForm(entry ?? blank(defaultPropertyId ?? properties[0]?.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, defaultPropertyId]);

  const patch = (value: Partial<ExpenseEntry>) => setForm((current) => ({ ...current, ...value }));

  const save = async () => {
    if (!form.propertyId) {
      toast("Select a property", "error");
      return;
    }
    await db.expenses.put(form);
    toast(entry ? "Expense updated" : "Expense recorded");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? "Edit expense" : "Record expense"}
      description="Holding costs, maintenance and compliance spend."
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
        <Field label="Date">
          <Input type="date" value={form.date} onChange={(event) => patch({ date: event.target.value })} />
        </Field>
        <Field label="Category">
          <Select
            value={form.category}
            onChange={(event) => patch({ category: event.target.value as ExpenseEntry["category"] })}
          >
            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {titleise(category)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Supplier">
          <Input value={form.supplier ?? ""} onChange={(event) => patch({ supplier: event.target.value })} />
        </Field>
        <Field label="Amount (inc GST)">
          <MoneyInput
            value={form.amount}
            onValueChange={(value) => patch({ amount: value, gst: Math.round((value / 11) * 100) / 100 })}
          />
        </Field>
        <Field label="GST">
          <MoneyInput value={form.gst} onValueChange={(value) => patch({ gst: value })} />
        </Field>
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <Toggle
            label="Tax deductible"
            checked={form.taxDeductible}
            onChange={(checked) => patch({ taxDeductible: checked })}
          />
          <Toggle
            label="Capital works (depreciable)"
            checked={form.capital}
            onChange={(checked) => patch({ capital: checked })}
          />
        </div>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes ?? ""} onChange={(event) => patch({ notes: event.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function blank(propertyId?: string): ExpenseEntry {
  return {
    id: uid(),
    propertyId: propertyId ?? "",
    date: todayIso(),
    category: "maintenance",
    amount: 0,
    gst: 0,
    taxDeductible: true,
    capital: false,
    createdAt: nowIso()
  };
}
