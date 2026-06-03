"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
      className={`flex h-full shrink-0 flex-col items-center bg-slate-900 transition-[width] duration-200 ease-out ${
        narrow ? "w-16" : "w-[13.5rem]"
      }`}
    >
      <div className="flex h-14 w-full shrink-0 items-center justify-center border-b border-slate-800/80 px-2">
        <Link
          href="/dashboard"
          className="flex items-center justify-center text-white transition-opacity hover:opacity-90"
          title="CycleIQ"
        >
          {narrow ? (
            <CycleIQMark className="h-9 w-9 text-emerald-400" />
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CycleIQMark className="h-8 w-8 shrink-0 text-emerald-400" />
              <span className="text-base font-bold leading-tight tracking-tight">
                CycleIQ
              </span>
            </span>
          )}
        </Link>
      </div>

      <nav
        className={`flex w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto py-3 ${
          narrow ? "px-1.5" : "px-2"
        }`}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={narrow ? item.label : undefined}
              className={`flex w-full items-center justify-center rounded-lg font-medium transition-colors ${
                narrow ? "px-0 py-2.5" : "gap-2 px-1.5 py-2.5"
              } ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className={iconMd} strokeWidth={isActive ? 2.25 : iconStroke} />
              {!narrow && (
                <span className="text-[13px] leading-tight">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="w-full shrink-0 border-t border-slate-800 p-2">
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
