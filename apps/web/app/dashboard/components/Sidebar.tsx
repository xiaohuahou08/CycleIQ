"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNav = [
  { label: "Dashboard", icon: "🏠", href: "/dashboard" },
  { label: "Trades", icon: "💹", href: "/trades" },
  { label: "Calendars", icon: "📅", disabled: true },
  { label: "Performance", icon: "📊", disabled: true },
  { label: "Benchmark", icon: "📈", disabled: true },
  { label: "Visualization", icon: "🎨", disabled: true },
  { label: "AI Analytics", icon: "🤖", disabled: true },
];

const dataNav = [
  { label: "Tickers", icon: "📌", disabled: true },
  { label: "Alerts", icon: "🔔", disabled: true },
  { label: "Watchlists", icon: "👀", disabled: true },
];

const adminNav = [
  { label: "Taxes", icon: "🧾", disabled: true },
  { label: "Tools", icon: "🔧", disabled: true },
  { label: "Billing", icon: "💰", disabled: true },
  { label: "Exports", icon: "📤", disabled: true },
  { label: "Support", icon: "❓", disabled: true },
  { label: "Settings", icon: "⚙️", disabled: true },
];

interface NavSection {
  title: string;
  items: { label: string; icon: string; href?: string; disabled?: boolean }[];
}

const sections: NavSection[] = [
  { title: "Main", items: mainNav },
  { title: "Data", items: dataNav },
  { title: "Admin", items: adminNav },
];

interface SidebarProps {
  email?: string | null;
}

export default function Sidebar({ email }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <Link href="/" className="text-base font-semibold text-gray-900">
          CycleIQ
        </Link>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = !item.disabled && item.href === pathname;
                if (item.disabled) {
                  return (
                    <li key={item.label}>
                      <span className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-gray-400">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                        <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">
                          Soon
                        </span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href!}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-gray-900 text-white"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer — logout lives in the top header user menu */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-700">
            {email ? email[0].toUpperCase() : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-gray-600">{email ?? "Signed in"}</p>
            <p className="mt-0.5 text-[10px] text-gray-400">Account menu is top-right</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
