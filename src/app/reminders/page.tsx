"use client";

import * as React from "react";
import { BellRing, Check, Download, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { StatCard } from "@/components/ui/StatCard";
import { ReminderForm } from "@/components/forms/ReminderForm";
import { useProperties, useReminders } from "@/hooks/useData";
import { useCurrencyFilter } from "@/components/providers/CurrencyProvider";
import { nextOccurrence } from "@/lib/calc";
import { cn, daysUntil, formatDate, titleise } from "@/lib/format";
import { exportSingleSheet } from "@/lib/export/excel";
import { EXPORTS_ENABLED } from "@/lib/features";
import { useToast } from "@/components/ui/Toast";
import type { Reminder } from "@/lib/types";

export default function RemindersPage() {
  const toast = useToast();
  const { currency } = useCurrencyFilter();
  const reminders = useReminders() ?? [];
  const properties = useProperties() ?? [];
  const [filter, setFilter] = React.useState<"open" | "all" | "done">("open");
  const [editing, setEditing] = React.useState<Reminder | undefined>();
  const [open, setOpen] = React.useState(false);

  const rows = reminders
    .filter((reminder) => (filter === "all" ? true : filter === "done" ? reminder.completed : !reminder.completed))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const overdue = reminders.filter((reminder) => !reminder.completed && daysUntil(reminder.dueDate) < 0).length;
  const next30 = reminders.filter((reminder) => {
    const days = daysUntil(reminder.dueDate);
    return !reminder.completed && days >= 0 && days <= 30;
  }).length;

  const complete = async (reminder: Reminder) => {
    if (reminder.recurrence !== "none") {
      await db.reminders.put({
        ...reminder,
        dueDate: nextOccurrence(reminder.dueDate, reminder.recurrence),
        completed: false
      });
      toast("Rolled forward to next occurrence");
      return;
    }
    await db.reminders.put({ ...reminder, completed: true, completedAt: new Date().toISOString() });
    toast("Reminder completed");
  };

  return (
    <>
      <PageHeader
        title="Reminders"
        subtitle="Insurance, leases, inspections and compliance — with email lead times."
        actions={
          <>
            {EXPORTS_ENABLED ? (
              <Button variant="secondary" onClick={() => exportSingleSheet("Reminders", undefined, currency)}>
                <Download size={16} /> Excel
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus size={16} /> New reminder
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Overdue" value={String(overdue)} tone="negative" icon={<BellRing size={20} />} />
        <StatCard label="Due in 30 days" value={String(next30)} tone="warning" />
        <StatCard label="Total scheduled" value={String(reminders.filter((item) => !item.completed).length)} />
      </section>

      <div className="flex gap-1 rounded-2xl border border-border bg-surface p-1.5">
        {(["open", "done", "all"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold capitalize transition",
              filter === item ? "bg-brand text-white" : "text-muted hover:text-fg"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<BellRing size={22} />}
          title="Nothing scheduled"
          description="Add renewals, inspections and rent reviews so nothing slips through."
          action={
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              New reminder
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader title="Schedule" subtitle={`${rows.length} items`} />
          <CardBody className="space-y-2.5">
            {rows.map((reminder) => {
              const days = daysUntil(reminder.dueDate);
              const property = properties.find((item) => item.id === reminder.propertyId);
              return (
                <div
                  key={reminder.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-bg/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("font-semibold", reminder.completed && "line-through opacity-60")}>
                        {reminder.title}
                      </p>
                      <Badge tone="brand">{titleise(reminder.category)}</Badge>
                      {reminder.recurrence !== "none" ? (
                        <span className="chip">
                          <RotateCcw size={11} /> {titleise(reminder.recurrence)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(reminder.dueDate)} · {property?.name ?? "Portfolio"} · alerts{" "}
                      {reminder.leadDays.join("/")} days before
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!reminder.completed ? (
                      <Badge tone={days < 0 ? "negative" : days <= 14 ? "warning" : "neutral"}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </Badge>
                    ) : (
                      <Badge tone="positive">Done</Badge>
                    )}
                    <Button variant="ghost" size="icon" aria-label="Complete" onClick={() => complete(reminder)}>
                      <Check size={16} className="text-positive" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(reminder);
                        setOpen(true);
                      }}
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={async () => {
                        await db.reminders.delete(reminder.id);
                        toast("Reminder deleted", "info");
                      }}
                    >
                      <Trash2 size={15} className="text-negative" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      <ReminderForm open={open} onClose={() => setOpen(false)} reminder={editing} />
    </>
  );
}
