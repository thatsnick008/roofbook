"use client";

import * as React from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { db, nowIso, uid } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState, PageHeader } from "@/components/ui/Primitives";
import { Select } from "@/components/ui/Field";
import { useDocuments, useProperties } from "@/hooks/useData";
import { useSync } from "@/components/providers/SyncProvider";
import { documentCategories } from "@/lib/options";
import { formatDate, titleise } from "@/lib/format";
import { triggerDownload } from "@/lib/export/excel";
import { useToast } from "@/components/ui/Toast";

export default function DocumentsPage() {
  const toast = useToast();
  const { sync } = useSync();
  const documents = useDocuments() ?? [];
  const properties = useProperties() ?? [];
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [propertyId, setPropertyId] = React.useState("");
  const [category, setCategory] = React.useState("contract");
  const [filter, setFilter] = React.useState("all");

  const rows = documents.filter((document) => (filter === "all" ? true : document.category === filter));

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const stamp = nowIso();
    const oversized = Array.from(files).filter((file) => file.size > 4 * 1024 * 1024);

    await db.documents.bulkPut(
      Array.from(files).map((file) => ({
        id: uid(),
        propertyId: propertyId || undefined,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        tags: [],
        category,
        blob: file,
        remote: false,
        uploadedAt: stamp
      }))
    );

    toast(
      oversized.length
        ? `${oversized.length} file(s) over 4 MB stay on this device only`
        : `${files.length} document${files.length === 1 ? "" : "s"} saved`,
      oversized.length ? "info" : "success"
    );
    if (inputRef.current) inputRef.current.value = "";
    void sync();
  };

  const download = async (id: string, name: string, blob?: Blob) => {
    if (blob) {
      triggerDownload(blob, name);
      return;
    }
    try {
      const response = await fetch(`/api/documents/${id}`);
      if (!response.ok) throw new Error();
      triggerDownload(await response.blob(), name);
    } catch {
      toast("Could not fetch this document", "error");
    }
  };

  const remove = async (id: string, remote: boolean) => {
    if (remote && navigator.onLine) {
      await fetch(`/api/documents/${id}`, { method: "DELETE" }).catch(() => undefined);
    }
    await db.documents.delete(id);
    toast("Document deleted", "info");
  };

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Contracts, policies, invoices and statements. Files up to 4 MB sync to your private cloud vault; larger files stay on this device."
        actions={
          <Button onClick={() => inputRef.current?.click()}>
            <Upload size={16} /> Upload
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => onUpload(event.target.files)}
      />

      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <Select value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
            <option value="">Portfolio-wide</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </Select>
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            {documentCategories.map((item) => (
              <option key={item} value={item}>
                {titleise(item)}
              </option>
            ))}
          </Select>
          <Select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Show all categories</option>
            {documentCategories.map((item) => (
              <option key={item} value={item}>
                {titleise(item)}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title="No documents stored"
          description="Upload contracts, insurance policies, invoices and statements to build your evidence pack."
          action={<Button onClick={() => inputRef.current?.click()}>Upload documents</Button>}
        />
      ) : (
        <Card>
          <CardHeader title="Evidence vault" subtitle={`${rows.length} files`} />
          <CardBody className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((document) => (
              <div key={document.id} className="flex items-start gap-3 rounded-2xl border border-border bg-bg/40 p-4">
                <span className="rounded-xl bg-brand/10 p-2.5 text-brand">
                  <FileText size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{document.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {titleise(document.category)} · {(document.size / 1024).toFixed(0)} KB ·{" "}
                    {formatDate(document.uploadedAt)}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {document.propertyId
                      ? properties.find((property) => property.id === document.propertyId)?.name ?? "Property"
                      : "Portfolio"}
                  </p>
                  <span className={`mt-1.5 inline-block text-[11px] font-semibold ${document.remote ? "text-positive" : "text-muted"}`}>
                    {document.remote ? "In cloud vault" : "This device only"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Download"
                    onClick={() => download(document.id, document.name, document.blob)}
                  >
                    <Download size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    onClick={() => remove(document.id, document.remote)}
                  >
                    <Trash2 size={15} className="text-negative" />
                  </Button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </>
  );
}
