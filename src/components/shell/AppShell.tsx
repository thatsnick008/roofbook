"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Building2, Command, LogOut, Moon, Plus, Sun } from "lucide-react";
import { navItems } from "@/lib/nav";
import { cn, initials } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/providers/ThemeProvider";
import { SyncIndicator } from "./SyncIndicator";
import { CommandPalette } from "./CommandPalette";
import { QuickAdd } from "@/components/quick/QuickAdd";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolved, toggle } = useTheme();
  const { data: session } = useSession();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const mobileItems = navItems.filter((item) => item.mobile);

  return (
    <div className="relative z-10 flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-border bg-surface/70 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white shadow-[0_10px_24px_-12px_rgb(var(--brand))]">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-brand">Roofbook</p>
          </div>
        </div>

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
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
              <Building2 size={18} />
            </div>
            <span className="text-sm font-bold">Roofbook</span>
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden max-w-md flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted transition hover:border-brand/40 lg:flex"
          >
            <Command size={15} />
            Search properties, expenses, reminders…
          </button>

          <div className="flex items-center gap-2">
            <SyncIndicator />
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {resolved === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            {session?.user ? (
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand">
                  {initials(session.user.name ?? session.user.email ?? "U")}
                </div>
                <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Sign out">
                  <LogOut size={17} />
                </Button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-32 pt-6 sm:px-6 lg:pb-12">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {mobileItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted transition",
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
    </div>
  );
}
