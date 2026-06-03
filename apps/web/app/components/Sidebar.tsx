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
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function Sidebar({ collapsed = false, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`flex h-full shrink-0 flex-col bg-[#111417] border-r border-[#2D3439] transition-all duration-200 ${collapsed ? "w-16" : "w-60"} py-6`}>
      <div className={`flex items-center mb-8 ${collapsed ? "justify-center px-2" : "px-6 gap-3"}`}>
        <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center border border-[#8B5CF6]/30">
          <span className="text-[#8B5CF6] font-bold text-[18px] select-none">⚡</span>
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-[#E1E2E7] leading-none">CYCLE</h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#94A3B8] opacity-50 mt-1">Premium Ledger</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {!collapsed && (
          <div className="px-3 mb-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8] opacity-50">Navigation</p>
          </div>
        )}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-[#8B5CF6]/10 text-[#8B5CF6] border-r-2 border-[#8B5CF6]"
                  : "text-[#94A3B8] hover:bg-[#1D2023] hover:text-[#E1E2E7]"
              } ${collapsed ? "justify-center" : "gap-3"}`}
              title={item.label}
            >
              <Icon className={`h-4 w-4 shrink-0 transition-transform ${isActive ? "scale-110" : ""}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 mb-4">
          <button className="w-full action-gradient text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/20 hover:opacity-90 transition-opacity">
            <span>📥</span> Broker Import
          </button>
        </div>
      )}

      <div className="border-t border-[#2D3439] pt-4 px-3 space-y-0.5">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`w-full rounded-xl px-3.5 py-2 text-xs font-medium text-[#94A3B8] hover:bg-[#1D2023] hover:text-[#E1E2E7] ${collapsed ? "text-center" : "text-left"}`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
          {!collapsed && <span className="ml-2">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
