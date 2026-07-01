"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  RefreshCw,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { CycleIQMark, iconSm, iconStroke } from "@/app/components/icons";
import UserAvatar from "@/app/components/UserAvatar";
import { useProtectedAuth } from "@/app/(protected)/auth-context";

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
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Mobile drawer mode — always expanded width, with close button */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SidebarNav({
  narrow,
  pathname,
  onNavigate,
}: {
  narrow: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
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
            onClick={onNavigate}
            className={`flex w-full items-center justify-center rounded-lg font-medium transition-all duration-200 ${
              narrow ? "px-0 py-2.5" : "gap-2.5 px-2 py-3"
            } ${
              isActive
                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            } ${isActive ? "" : "hover:translate-x-0.5"}`}
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
  );
}

function SidebarInner({
  narrow,
  pathname,
  profileLabel,
  displayName,
  email,
  avatarUrl,
  onToggleCollapsed,
  onMobileClose,
  showCollapseToggle,
}: {
  narrow: boolean;
  pathname: string;
  profileLabel: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  onToggleCollapsed?: () => void;
  onMobileClose?: () => void;
  showCollapseToggle: boolean;
}) {
  return (
    <>
      <div className="flex h-[3.75rem] w-full shrink-0 items-center justify-center border-b border-slate-800/80 px-2">
        <Link
          href="/dashboard"
          className="flex flex-1 items-center justify-center text-white transition-opacity hover:opacity-90"
          title="CycleIQ"
          onClick={onMobileClose}
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
        {onMobileClose ? (
          <button
            type="button"
            onClick={onMobileClose}
            className="mr-1 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X className={iconSm} strokeWidth={iconStroke} aria-hidden />
          </button>
        ) : null}
      </div>

      <SidebarNav narrow={narrow} pathname={pathname} onNavigate={onMobileClose} />

      <div className="w-full shrink-0 border-t border-slate-800 px-2 py-2">
        <Link
          href="/settings"
          title={profileLabel}
          onClick={onMobileClose}
          className={`flex w-full items-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white ${
            narrow ? "justify-center p-2" : "gap-2.5 px-2 py-2"
          } ${pathname === "/settings" ? "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20" : ""}`}
        >
          <UserAvatar
            src={avatarUrl}
            displayName={displayName}
            email={email}
            size="md"
            className="ring-slate-700"
          />
          {!narrow && (
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-base font-semibold leading-snug text-slate-100">
                {profileLabel}
              </span>
              {displayName && email ? (
                <span className="block truncate text-xs text-slate-500">{email}</span>
              ) : null}
            </span>
          )}
        </Link>
      </div>

      {showCollapseToggle ? (
        <div className="hidden w-full shrink-0 border-t border-slate-800 p-2 md:block">
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
      ) : null}
    </>
  );
}

export default function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { email, displayName, avatarUrl } = useProtectedAuth();
  const narrow = collapsed && !mobileOpen;
  const profileLabel = displayName ?? email ?? "Account";

  const sidebarContent = (
    <aside
      className={`flex h-full shrink-0 flex-col items-center bg-slate-900 transition-[width,transform] duration-200 ease-out [background-image:radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.08),transparent_55%)] ${
        narrow ? sb.narrow : sb.wide
      }`}
    >
      <SidebarInner
        narrow={narrow}
        pathname={pathname}
        profileLabel={profileLabel}
        displayName={displayName}
        email={email}
        avatarUrl={avatarUrl}
        onToggleCollapsed={onToggleCollapsed}
        onMobileClose={onMobileClose}
        showCollapseToggle={!mobileOpen}
      />
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden h-full shrink-0 md:flex">{sidebarContent}</div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 animate-fade-in"
            aria-label="Close menu"
            onClick={onMobileClose}
          />
          <div className="absolute inset-y-0 left-0 animate-slide-in-right shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      ) : null}
    </>
  );
}
