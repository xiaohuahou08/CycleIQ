"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  LayoutDashboard,
  RefreshCw,
  Settings,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const navItems: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trades", href: "/trades", icon: TrendingUp },
  { label: "Cycles", href: "/cycles", icon: RefreshCw },
  { label: "Reports", href: "/reports", icon: BarChart2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  email?: string | null;
  onLogout?: () => void;
}

export default function Sidebar({ email, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-slate-900">
      <div className="flex h-14 items-center px-5">
        <Link href="/dashboard" className="text-base font-bold tracking-tight text-white">
          CycleIQ
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-slate-200">
            {email ? email[0].toUpperCase() : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate-400">{email ?? "Signed in"}</p>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-slate-500 hover:text-white transition-colors"
              title="Logout"
            >
              ↩
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
