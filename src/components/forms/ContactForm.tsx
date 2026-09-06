"use client";

import * as React from "react";
import { db, nowIso, uid } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useProperties } from "@/hooks/useData";
import { contactRoles } from "@/lib/options";
import { titleise } from "@/lib/format";
import type { Contact } from "@/lib/types";

export function ContactForm({
  open,
  onClose,
  contact
}: {
  open: boolean;
  onClose: () => void;
  contact?: Contact;
}) {
  const toast = useToast();
  const properties = useProperties() ?? [];
  const [form, setForm] = React.useState<Contact>(blank);

  React.useEffect(() => {
    if (!open) return;
    setForm(contact ?? blank());
  }, [open, contact]);

  const patch = (value: Partial<Contact>) => setForm((current) => ({ ...current, ...value }));

  const save = async () => {
    if (!form.name.trim()) {
      toast("Add a contact name", "error");
      return;
    }
    await db.contacts.put(form);
    toast(contact ? "Contact updated" : "Contact saved");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contact ? "Edit contact" : "Add contact"}
      description="Property managers, insurers, brokers and trades."
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
        <Field label="Name">
          <Input value={form.name} onChange={(event) => patch({ name: event.target.value })} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={(event) => patch({ role: event.target.value as Contact["role"] })}>
            {contactRoles.map((role) => (
              <option key={role} value={role}>
                {titleise(role)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Company">
          <Input value={form.company ?? ""} onChange={(event) => patch({ company: event.target.value })} />
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
        <Field label="Phone">
          <Input value={form.phone ?? ""} onChange={(event) => patch({ phone: event.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email ?? ""} onChange={(event) => patch({ email: event.target.value })} />
        </Field>
        <Field label="Policy number">
          <Input value={form.policyNumber ?? ""} onChange={(event) => patch({ policyNumber: event.target.value })} />
        </Field>
        <Field label="Renewal date">
          <Input
            type="date"
            value={form.renewalDate ?? ""}
            onChange={(event) => patch({ renewalDate: event.target.value })}
          />
        </Field>
        <Field label="Premium">
          <MoneyInput value={form.premium ?? 0} onValueChange={(value) => patch({ premium: value })} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes ?? ""} onChange={(event) => patch({ notes: event.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function blank(): Contact {
  return {
    id: uid(),
    name: "",
    role: "property-manager",
    createdAt: nowIso()
  };
}
