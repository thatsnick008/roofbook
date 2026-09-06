"use client";

import * as React from "react";
import { db, nowIso, uid } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useProperties } from "@/hooks/useData";
import { defaultLeadDays, recurrences, reminderCategories } from "@/lib/options";
import { cn, titleise, todayIso } from "@/lib/format";
import type { Reminder } from "@/lib/types";

export function ReminderForm({
  open,
  onClose,
  reminder,
  defaultPropertyId
}: {
  open: boolean;
  onClose: () => void;
  reminder?: Reminder;
  defaultPropertyId?: string;
}) {
  const toast = useToast();
  const properties = useProperties() ?? [];
  const [form, setForm] = React.useState<Reminder>(() => blank(defaultPropertyId));

  React.useEffect(() => {
    if (!open) return;
    setForm(reminder ?? blank(defaultPropertyId));
  }, [open, reminder, defaultPropertyId]);

  const patch = (value: Partial<Reminder>) => setForm((current) => ({ ...current, ...value }));

  const toggleLead = (day: number) =>
    patch({
      leadDays: form.leadDays.includes(day)
        ? form.leadDays.filter((value) => value !== day)
        : [...form.leadDays, day].sort((a, b) => b - a)
    });

  const save = async () => {
    if (!form.title.trim()) {
      toast("Add a reminder title", "error");
      return;
    }
    await db.reminders.put(form);
    toast(reminder ? "Reminder updated" : "Reminder scheduled");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reminder ? "Edit reminder" : "New reminder"}
      description="Compliance, renewals and reviews — with email lead times."
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
        <Field label="Title" className="sm:col-span-2">
          <Input
            value={form.title}
            placeholder="e.g. Landlord insurance renewal"
            onChange={(event) => patch({ title: event.target.value })}
          />
        </Field>
        <Field label="Category">
          <Select
            value={form.category}
            onChange={(event) => patch({ category: event.target.value as Reminder["category"] })}
          >
            {reminderCategories.map((category) => (
              <option key={category} value={category}>
                {titleise(category)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Property">
          <Select value={form.propertyId ?? ""} onChange={(event) => patch({ propertyId: event.target.value })}>
            <option value="">Whole portfolio</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due date">
          <Input type="date" value={form.dueDate} onChange={(event) => patch({ dueDate: event.target.value })} />
        </Field>
        <Field label="Recurrence">
          <Select
            value={form.recurrence}
            onChange={(event) => patch({ recurrence: event.target.value as Reminder["recurrence"] })}
          >
            {recurrences.map((recurrence) => (
              <option key={recurrence} value={recurrence}>
                {titleise(recurrence)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Email reminders (days before)" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {defaultLeadDays.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleLead(day)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  form.leadDays.includes(day)
                    ? "border-brand bg-brand/15 text-brand"
                    : "border-border bg-elevated text-muted"
                )}
              >
                {day}d
              </button>
            ))}
          </div>
        </Field>
        <Field label="Notify email" className="sm:col-span-2">
          <Input
            type="email"
            value={form.notifyEmail ?? ""}
            placeholder="you@example.com"
            onChange={(event) => patch({ notifyEmail: event.target.value })}
          />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes ?? ""} onChange={(event) => patch({ notes: event.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function blank(propertyId?: string): Reminder {
  return {
    id: uid(),
    propertyId,
    title: "",
    category: "custom",
    dueDate: todayIso(),
    recurrence: "yearly",
    leadDays: [30, 14, 7, 1],
    completed: false,
    createdAt: nowIso()
  };
}
