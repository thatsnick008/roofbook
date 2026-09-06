"use client";

import * as React from "react";
import { Download, Mail, Pencil, Phone, Plus, Trash2, Users } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { ContactForm } from "@/components/forms/ContactForm";
import { useContacts, useProperties } from "@/hooks/useData";
import { daysUntil, formatDate, money, titleise } from "@/lib/format";
import { exportSingleSheet } from "@/lib/export/excel";
import { useToast } from "@/components/ui/Toast";
import type { Contact } from "@/lib/types";

export default function ContactsPage() {
  const toast = useToast();
  const contacts = useContacts() ?? [];
  const properties = useProperties() ?? [];
  const [editing, setEditing] = React.useState<Contact | undefined>();
  const [open, setOpen] = React.useState(false);

  const grouped = contacts.reduce<Record<string, Contact[]>>((acc, contact) => {
    (acc[contact.role] ??= []).push(contact);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Contacts & Insurance"
        subtitle="Managers, insurers, brokers, trades and policy renewals."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportSingleSheet("Contacts & Insurance")}>
              <Download size={16} /> Excel
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus size={16} /> Add contact
            </Button>
          </>
        }
      />

      {contacts.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="No contacts yet"
          description="Store your property manager, insurer, broker and trusted trades in one place."
          action={
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              Add contact
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([role, items]) => (
            <Card key={role}>
              <CardHeader title={titleise(role)} subtitle={`${items.length} contact${items.length === 1 ? "" : "s"}`} />
              <CardBody className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((contact) => {
                  const renewalDays = contact.renewalDate ? daysUntil(contact.renewalDate) : undefined;
                  return (
                    <div key={contact.id} className="rounded-2xl border border-border bg-bg/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{contact.name}</p>
                          <p className="truncate text-xs text-muted">
                            {contact.company || "—"} ·{" "}
                            {contact.propertyId
                              ? properties.find((property) => property.id === contact.propertyId)?.name ?? "Property"
                              : "Portfolio"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit"
                            onClick={() => {
                              setEditing(contact);
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
                              await db.contacts.delete(contact.id);
                              toast("Contact deleted", "info");
                            }}
                          >
                            <Trash2 size={15} className="text-negative" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5 text-sm">
                        {contact.phone ? (
                          <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-muted hover:text-fg">
                            <Phone size={14} /> {contact.phone}
                          </a>
                        ) : null}
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-muted hover:text-fg">
                            <Mail size={14} /> <span className="truncate">{contact.email}</span>
                          </a>
                        ) : null}
                      </div>

                      {contact.policyNumber || contact.renewalDate ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {contact.policyNumber ? <span className="chip">#{contact.policyNumber}</span> : null}
                          {contact.renewalDate ? (
                            <Badge
                              tone={
                                renewalDays === undefined ? "neutral" : renewalDays < 0 ? "negative" : renewalDays <= 30 ? "warning" : "neutral"
                              }
                            >
                              Renews {formatDate(contact.renewalDate)}
                            </Badge>
                          ) : null}
                          {contact.premium ? <span className="chip">{money(contact.premium)}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <ContactForm open={open} onClose={() => setOpen(false)} contact={editing} />
    </>
  );
}
