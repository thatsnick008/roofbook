"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Building2, Coins, Command, Moon, Plus, Sun } from "lucide-react";
import { navItems } from "@/lib/nav";
import { cn, initials } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useCurrencyFilter } from "@/components/providers/CurrencyProvider";
import { currencies } from "@/lib/options";
import { SyncIndicator } from "./SyncIndicator";
import { CommandPalette } from "./CommandPalette";
import { QuickAdd } from "@/components/quick/QuickAdd";
import { APP_VERSION } from "@/lib/version";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { SIGNED_IN_KEY } from "./AuthGate";
import { clearAllData } from "@/lib/db";
import { LOCAL_OWNER_KEY } from "@/components/providers/SyncProvider";
import type { CurrencyCode } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolved, toggle } = useTheme();
  const { data: session } = useSession();
  const toast = useToast();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [account, setAccount] = React.useState({ name: "", email: "", password: "" });
  const [accountSaving, setAccountSaving] = React.useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const mobileItems = navItems.filter((item) => item.mobile);

  const openAccount = async () => {
    setAccountOpen(true);
    const response = await fetch("/api/auth/account");
    if (!response.ok) return;
    const result = await response.json();
    setAccount({ name: result.user.name ?? "", email: result.user.email ?? "", password: "" });
  };

  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setAccountSaving(true);
    const response = await fetch("/api/auth/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account)
    });
    const result = await response.json();
    setAccountSaving(false);
    if (!response.ok) {
      toast(result.error ?? "Could not update account", "error");
      return;
    }
    toast("Account details updated");
    setAccount((current) => ({ ...current, password: "" }));
    setAccountOpen(false);
  };

  const handleSignOut = async () => {
    setAccountOpen(false);
    // Drop the offline-access grant and local cache so the next account on this device starts clean.
    window.localStorage.removeItem(SIGNED_IN_KEY);
    window.localStorage.removeItem(LOCAL_OWNER_KEY);
    await clearAllData();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="relative z-10 flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-border bg-surface/70 backdrop-blur-xl lg:flex">
        <Link
          href="/"
          className="flex items-center gap-3 px-5 py-6 transition hover:opacity-80"
          aria-label="Dashboard"
          title="Dashboard"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white shadow-[0_10px_24px_-12px_rgb(var(--brand))]">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-brand">Roofbook</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">v{APP_VERSION}</p>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-item", isActive(item.href) && "nav-item-active")}
            >
              <item.icon size={18} />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <CurrencyScopePicker />
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-bg/60 px-3 py-2.5 text-sm text-muted transition hover:text-fg"
          >
            <span className="flex items-center gap-2">
              <Command size={15} /> Quick search
            </span>
            <kbd className="chip">⌘K</kbd>
          </button>
          <Button className="w-full" onClick={() => setQuickOpen(true)}>
            <Plus size={16} /> Quick add
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-bg/80 px-4 pb-2 pt-[calc(max(env(safe-area-inset-top),0.5rem)+0.5rem)] backdrop-blur-xl sm:px-6 lg:pt-2">
          <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="Dashboard">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Roofbook</p>
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted">v{APP_VERSION}</p>
            </div>
          </Link>

          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden max-w-md flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted transition hover:border-brand/40 lg:flex"
          >
            <Command size={15} />
            Search properties, expenses, reminders…
          </button>

          <div className="flex items-center gap-2">
            <CurrencyScopePicker compact className="lg:hidden" />
            <SyncIndicator />
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={toggle} aria-label="Toggle theme">
              {resolved === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            {session?.user ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openAccount()}
                  className="grid h-9 w-9 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand transition hover:ring-4 hover:ring-brand/15"
                  aria-label="Edit account details"
                  title="Account details"
                >
                  {initials(session.user.name ?? session.user.email ?? "U")}
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="min-w-0 flex-1 px-5 pb-32 pt-7 sm:px-6 lg:pb-12">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}>
          {mobileItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-muted transition",
                isActive(item.href) && "text-brand"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <button
        onClick={() => setQuickOpen(true)}
        aria-label="Quick add"
        className="no-print fixed bottom-20 right-5 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white shadow-pop transition active:scale-95 lg:hidden"
      >
        <Plus size={24} />
      </button>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
      <Modal open={accountOpen} onClose={() => setAccountOpen(false)} title="Account details" description="Update your name, email, or password.">
        <form onSubmit={saveAccount} className="space-y-4">
          <Field label="Name">
            <Input value={account.name} onChange={(event) => setAccount((current) => ({ ...current, name: event.target.value }))} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={account.email} onChange={(event) => setAccount((current) => ({ ...current, email: event.target.value }))} required />
          </Field>
          <Field label="New password" hint="Leave blank to keep the current password.">
            <Input type="password" minLength={8} value={account.password} onChange={(event) => setAccount((current) => ({ ...current, password: event.target.value }))} />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" onClick={() => void handleSignOut()}>Sign out</Button>
            <Button type="submit" disabled={accountSaving}>{accountSaving ? "Saving…" : "Save account details"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/** Scopes the whole app to one currency for this browser session only — never persisted to settings. */
function CurrencyScopePicker({ compact, className }: { compact?: boolean; className?: string }) {
  const { currency, setCurrency, available } = useCurrencyFilter();
  const labels = new Map(currencies.map((item) => [item.code, item.label] as const));

  if (available.length < 2) return null;

  const select = (
    <Select
      value={currency}
      onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
      className={compact ? "h-11 w-[92px] px-2.5 text-sm font-semibold" : undefined}
      aria-label="Currency view"
    >
      {available.map((code) => (
        <option key={code} value={code}>
          {compact ? code : labels.get(code) ?? code}
        </option>
      ))}
    </Select>
  );

  if (compact) return <div className={className}>{select}</div>;

  return (
    <label className={cn("block", className)}>
      <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <Coins size={12} /> Currency view
      </span>
      {select}
    </label>
  );
}
