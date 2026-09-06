"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { navItems } from "@/lib/nav";
import { useProperties } from "@/hooks/useData";
import { cn } from "@/lib/format";
import type { Property } from "@/lib/types";

const EMPTY_PROPERTIES: Property[] = [];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const properties = useProperties() ?? EMPTY_PROPERTIES;
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
    }
  }, [open, pathname]);

  const results = React.useMemo(() => {
    const items = [
      ...navItems.map((item) => ({ href: item.href, label: item.label, hint: item.description })),
      ...properties.map((property) => ({
        href: `/properties/${property.id}`,
        label: property.name,
        hint: `${property.suburb} ${property.state}`.trim()
      }))
    ];
    const q = query.trim().toLowerCase();
    return q ? items.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(q)).slice(0, 8) : items.slice(0, 8);
  }, [query, properties]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} aria-hidden />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-pop animate-scale-in">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={18} className="text-muted" />
          <input
            autoFocus
            value={query}
            placeholder="Jump to a property or module…"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") setActive((i) => Math.min(i + 1, results.length - 1));
              if (event.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
              if (event.key === "Enter" && results[active]) {
                router.push(results[active].href);
                onOpenChange(false);
              }
            }}
            className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <kbd className="chip">ESC</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.map((item, index) => (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={item.href}
                onClick={() => onOpenChange(false)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm",
                  index === active ? "bg-brand/10 text-fg" : "text-muted"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{item.label}</span>
                  <span className="block truncate text-xs text-muted">{item.hint}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
          {results.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted">No matches</li> : null}
        </ul>
      </div>
    </div>
  );
}
