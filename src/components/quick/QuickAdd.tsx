"use client";

import * as React from "react";
import { BellRing, Building2, Receipt, Users, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PropertyForm } from "@/components/forms/PropertyForm";
import { IncomeForm } from "@/components/forms/IncomeForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { ReminderForm } from "@/components/forms/ReminderForm";
import { ContactForm } from "@/components/forms/ContactForm";

type Target = "property" | "income" | "expense" | "reminder" | "contact" | null;

const actions = [
  { key: "income", label: "Record rent", hint: "Fortnightly income", icon: Wallet, tone: "text-positive" },
  { key: "expense", label: "Log expense", hint: "Holding cost or repair", icon: Receipt, tone: "text-negative" },
  { key: "reminder", label: "Set reminder", hint: "Renewal or inspection", icon: BellRing, tone: "text-warning" },
  { key: "property", label: "Add property", hint: "New asset & loan", icon: Building2, tone: "text-brand" },
  { key: "contact", label: "Add contact", hint: "Manager or insurer", icon: Users, tone: "text-brand" }
] as const;

export function QuickAdd({
  open,
  onClose,
  defaultPropertyId
}: {
  open: boolean;
  onClose: () => void;
  defaultPropertyId?: string;
}) {
  const [target, setTarget] = React.useState<Target>(null);

  const launch = (next: Target) => {
    onClose();
    setTarget(next);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} size="sm" title="Quick add" description="Two taps to capture anything.">
        <div className="grid gap-2">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={() => launch(action.key)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-elevated px-4 py-3 text-left transition hover:border-brand/40 hover:bg-brand/5 active:scale-[.99]"
            >
              <span className={`rounded-xl bg-bg p-2.5 ${action.tone}`}>
                <action.icon size={20} />
              </span>
              <span>
                <span className="block text-sm font-semibold">{action.label}</span>
                <span className="block text-xs text-muted">{action.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <PropertyForm open={target === "property"} onClose={() => setTarget(null)} />
      <IncomeForm open={target === "income"} onClose={() => setTarget(null)} defaultPropertyId={defaultPropertyId} />
      <ExpenseForm open={target === "expense"} onClose={() => setTarget(null)} defaultPropertyId={defaultPropertyId} />
      <ReminderForm open={target === "reminder"} onClose={() => setTarget(null)} defaultPropertyId={defaultPropertyId} />
      <ContactForm open={target === "contact"} onClose={() => setTarget(null)} />
    </>
  );
}
