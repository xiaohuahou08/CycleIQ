"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-[color:var(--muted)]">System</div>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Panel title="Appearance" subtitle="Theme">
          <div className="text-sm text-[color:var(--muted)]">
            Theme controls live in the top-left toggle in the sidebar header.
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)]">
      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-[color:var(--muted)]">{subtitle}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

