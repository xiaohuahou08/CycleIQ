"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Gauge,
  ListOrdered,
  Settings,
  WalletCards,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/cycles", label: "Cycles", icon: WalletCards },
  { href: "/orders", label: "Orders", icon: ListOrdered },
  { href: "/executions", label: "Executions", icon: Activity },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-full flex bg-background text-foreground">
      <aside className="w-[260px] shrink-0 border-r border-border bg-[color:var(--panel)]">
        <div className="h-14 px-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[color:var(--panel-2)] border border-border grid place-items-center">
              <span className="text-sm font-semibold tracking-wide text-[color:var(--accent)]">
                CI
              </span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">CycleIQ</div>
              <div className="text-xs text-[color:var(--muted)]">
                Trading Terminal (MVP)
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <nav className="p-2 space-y-1">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-transparent",
                  "hover:bg-[color:var(--panel-2)] hover:border-border transition-colors",
                  active &&
                    "bg-[color:var(--panel-2)] border-border text-foreground"
                )}
              >
                <Icon className="h-4 w-4 text-[color:var(--muted)]" />
                <span className="flex-1">{item.label}</span>
                {active ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 px-4 flex items-center justify-between border-b border-border bg-[color:var(--panel)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-sm text-[color:var(--muted)] truncate">
              {pathname}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[color:var(--muted)]">
              Simulated mode
            </span>
            <span className="text-xs px-2 py-1 rounded-md border border-border bg-[color:var(--panel-2)]">
              DRY-RUN
            </span>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

