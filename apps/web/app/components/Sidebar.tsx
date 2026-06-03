"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  RefreshCw,
  Settings,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { CycleIQMark, iconMd, iconStroke } from "@/app/components/icons";

const navItems: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trades", href: "/trades", icon: TrendingUp },
  { label: "Cycles", href: "/cycles", icon: RefreshCw },
  { label: "Reports", href: "/reports", icon: BarChart2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function Sidebar({ collapsed = false, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const narrow = collapsed;

  return (
    <aside
      className={`flex h-full shrink-0 flex-col bg-slate-900 transition-[width] duration-200 ease-out ${
        narrow ? "w-[4.5rem]" : "w-60"
      }`}
    >
      <div
        className={`flex h-16 shrink-0 items-center border-b border-slate-800/80 ${
          narrow ? "justify-center px-0" : "px-5"
        }`}
      >
        <Link
          href="/dashboard"
          className={`text-white transition-opacity hover:opacity-90 ${
            narrow ? "flex items-center justify-center" : "block min-w-0"
          }`}
          title="CycleIQ"
        >
          {narrow ? (
            <CycleIQMark className="h-10 w-10 text-emerald-400" />
          ) : (
            <span className="flex items-center gap-2.5">
              <CycleIQMark className="h-9 w-9 shrink-0 text-emerald-400" />
              <span className="text-[1.35rem] font-bold leading-none tracking-tight">CycleIQ</span>
            </span>
          )}
        </Link>
      </div>

      <nav className={`flex-1 space-y-1 overflow-y-auto py-4 ${narrow ? "px-2" : "px-3"}`}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={narrow ? item.label : undefined}
              className={`flex items-center rounded-lg font-medium transition-colors ${
                narrow ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
              } ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className={iconMd} strokeWidth={isActive ? 2.25 : iconStroke} />
              {!narrow && <span className="text-[13px] leading-none">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-800 p-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-center rounded-lg py-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          aria-label={narrow ? "Expand sidebar" : "Collapse sidebar"}
          title={narrow ? "Expand sidebar" : "Collapse sidebar"}
        >
          {narrow ? (
            <ChevronRight className={iconMd} strokeWidth={iconStroke} aria-hidden />
          ) : (
            <ChevronLeft className={iconMd} strokeWidth={iconStroke} aria-hidden />
          )}
        </button>
      </div>
    </aside>
  );
}
