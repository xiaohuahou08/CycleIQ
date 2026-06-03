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
import { CycleIQMark, iconStroke } from "@/app/components/icons";

/** Icon / type scale follows sidebar mode (expanded vs collapsed). */
const sb = {
  wide: "w-[14rem]",
  narrow: "w-[4.25rem]",
  logoMark: { wide: "h-9 w-9", narrow: "h-10 w-10" },
  logoText: "text-[1.0625rem] font-bold leading-tight tracking-tight",
  navIcon: { wide: "h-5 w-5", narrow: "h-[1.375rem] w-[1.375rem]" },
  navLabel: "text-sm leading-tight",
} as const;

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
        narrow ? sb.narrow : sb.wide
      }`}
    >
      <div className="flex h-[3.75rem] w-full shrink-0 items-center justify-center border-b border-slate-800/80 px-2">
        <Link
          href="/dashboard"
          className="flex items-center justify-center text-white transition-opacity hover:opacity-90"
          title="CycleIQ"
        >
          {narrow ? (
            <CycleIQMark className={`${sb.logoMark.narrow} text-emerald-400`} />
          ) : (
            <span className="flex max-w-full items-center justify-center gap-2 px-1">
              <CycleIQMark className={`${sb.logoMark.wide} shrink-0 text-emerald-400`} />
              <span className={`${sb.logoText} truncate`}>CycleIQ</span>
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
                narrow ? "px-0 py-2.5" : "gap-2.5 px-2 py-3"
              } ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon
                className={`shrink-0 ${narrow ? sb.navIcon.narrow : sb.navIcon.wide}`}
                strokeWidth={isActive ? 2.25 : iconStroke}
              />
              {!narrow && <span className={sb.navLabel}>{item.label}</span>}
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
            <ChevronRight
              className={narrow ? sb.navIcon.narrow : sb.navIcon.wide}
              strokeWidth={iconStroke}
              aria-hidden
            />
          ) : (
            <ChevronLeft className={sb.navIcon.wide} strokeWidth={iconStroke} aria-hidden />
          )}
        </button>
      </div>
    </aside>
  );
}
