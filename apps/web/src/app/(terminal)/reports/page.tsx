export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-[color:var(--muted)]">Analytics</div>
        <h1 className="text-xl font-semibold">Reports</h1>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)] p-4">
        <div className="text-sm font-medium">MVP reports</div>
        <div className="mt-1 text-sm text-[color:var(--muted)]">
          This page will summarize cycle PnL, premium income, win-rate proxy, and
          roll counts once you have cycles and fills in Supabase.
        </div>
      </div>
    </div>
  );
}

