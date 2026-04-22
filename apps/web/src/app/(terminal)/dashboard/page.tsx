export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-[color:var(--muted)]">Overview</div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/cycles"
            className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
          >
            View cycles
          </a>
          <a
            href="/orders"
            className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
          >
            Pending orders
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard label="Total premium" value="$0" hint="Simulated" />
        <KpiCard label="Realized PnL" value="$0" hint="Simulated" />
        <KpiCard label="Open cycles" value="0" hint="Active" />
        <KpiCard label="Action required" value="0" hint="Approvals / failures" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel title="Action required" subtitle="Pending approvals and failures">
          <div className="text-sm text-[color:var(--muted)]">
            No pending actions yet. Seed demo data in Settings to populate the
            terminal.
          </div>
        </Panel>
        <Panel title="Recent activity" subtitle="Audit/event feed (MVP)">
          <div className="text-sm text-[color:var(--muted)]">No events yet.</div>
        </Panel>
        <Panel title="Market (mock)" subtitle="Simulated quotes and IV">
          <div className="text-sm text-[color:var(--muted)]">
            Market data mock will appear after seeding.
          </div>
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)] p-4">
      <div className="text-xs text-[color:var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-[color:var(--muted)]">{hint}</div>
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

