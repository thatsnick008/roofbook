"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Download, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { Input, Select } from "@/components/ui/Field";
import { PropertyForm } from "@/components/forms/PropertyForm";
import { usePortfolio } from "@/hooks/useData";
import { useCurrencyFilter } from "@/components/providers/CurrencyProvider";
import { compactMoney, money, percent, titleise } from "@/lib/format";
import { exportSingleSheet } from "@/lib/export/excel";
import { EXPORTS_ENABLED } from "@/lib/features";
import { propertyStatuses } from "@/lib/options";

export default function PropertiesPage() {
  const { currency } = useCurrencyFilter();
  const { metrics } = usePortfolio();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [sort, setSort] = React.useState("value");
  const [addOpen, setAddOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return metrics
      .filter((metric) => (status === "all" ? true : metric.property.status === status))
      .filter((metric) =>
        q
          ? `${metric.property.name} ${metric.property.suburb} ${metric.property.address}`.toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => {
        if (sort === "value") return b.valuation - a.valuation;
        if (sort === "equity") return b.equity - a.equity;
        if (sort === "cashflow") return b.cashflow - a.cashflow;
        if (sort === "yield") return b.netYield - a.netYield;
        return a.property.name.localeCompare(b.property.name);
      });
  }, [metrics, query, status, sort]);

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

      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              className="pl-10"
              placeholder="Search by name, suburb or address"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={status} onChange={(event) => setStatus(event.target.value)} className="sm:w-44">
            <option value="all">All statuses</option>
            {propertyStatuses.map((item) => (
              <option key={item} value={item}>
                {titleise(item)}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(event) => setSort(event.target.value)} className="sm:w-44">
            <option value="value">Sort: Value</option>
            <option value="equity">Sort: Equity</option>
            <option value="cashflow">Sort: Cashflow</option>
            <option value="yield">Sort: Net yield</option>
            <option value="name">Sort: Name</option>
          </Select>
        </CardBody>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<SlidersHorizontal size={24} />}
          title="No properties match"
          description="Adjust your filters or add a new property to the portfolio."
          action={<Button onClick={() => setAddOpen(true)}>Add property</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((metric) => (
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
