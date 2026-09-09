"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { PropertyForm } from "@/components/forms/PropertyForm";
import { usePortfolio } from "@/hooks/useData";
import { useCurrencyFilter } from "@/components/providers/CurrencyProvider";
import { compactMoney, money, percent, titleise } from "@/lib/format";
import { exportSingleSheet } from "@/lib/export/excel";
import { EXPORTS_ENABLED } from "@/lib/features";

export default function PropertiesPage() {
  const { currency } = useCurrencyFilter();
  const { metrics } = usePortfolio();
  const [addOpen, setAddOpen] = React.useState(false);

  const sortedMetrics = React.useMemo(
    () => [...metrics].sort((a, b) => b.valuation - a.valuation),
    [metrics]
  );

  return (
    <>
      <PageHeader
        title="Properties"
        subtitle="Every asset, its acquisition costs and live performance."
        actions={
          <>
            {EXPORTS_ENABLED ? (
              <Button variant="secondary" onClick={() => exportSingleSheet("Properties", undefined, currency)}>
                <Download size={16} /> Excel
              </Button>
            ) : null}
            <Button onClick={() => setAddOpen(true)}>
              <Building2 size={16} /> Add property
            </Button>
          </>
        }
      />

      {sortedMetrics.length === 0 ? (
        <EmptyState
          icon={<Building2 size={24} />}
          title="No properties yet"
          description="Add a property to start building your portfolio."
          action={<Button onClick={() => setAddOpen(true)}>Add property</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedMetrics.map((metric) => (
            <Link
              key={metric.property.id}
              href={`/properties/${metric.property.id}`}
              className="card group overflow-hidden transition hover:-translate-y-0.5 hover:border-brand/40"
            >
              <div className="h-24 w-full" style={{ background: `linear-gradient(135deg, ${metric.property.accent}, transparent)` }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{metric.property.name}</p>
                    <p className="truncate text-sm text-muted">
                      {metric.property.suburb}, {metric.property.state} {metric.property.postcode}
                    </p>
                  </div>
                  <Badge tone={metric.property.status === "owned" ? "positive" : "neutral"}>
                    {titleise(metric.property.status)}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted">
                  <span className="chip">{metric.property.bedrooms} bed</span>
                  <span className="chip">{metric.property.bathrooms} bath</span>
                  <span className="chip">{metric.property.carSpaces} car</span>
                  <span className="chip">{titleise(metric.property.type)}</span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Valuation</dt>
                    <dd className="font-semibold">{money(metric.valuation, false, metric.property.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Debt</dt>
                    <dd className="font-semibold">{compactMoney(metric.debt, metric.property.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Equity</dt>
                    <dd className="font-semibold text-positive">{compactMoney(metric.equity, metric.property.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Net yield</dt>
                    <dd className="font-semibold">{percent(metric.netYield, 2)}</dd>
                  </div>
                </dl>
              </div>
            </Link>
          ))}
        </div>
      )}

      <PropertyForm open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
