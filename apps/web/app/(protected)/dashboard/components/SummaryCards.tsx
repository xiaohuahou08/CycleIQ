import type { MetricsSummary } from "@/lib/api/trades";
import { CARD_BASE } from "@/app/components/ui/styles";

function fmt(value: number, style: "currency" | "percent"): string {
  if (style === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return `${value.toFixed(1)}%`;
}

interface CardProps {
  label: string;
  value: string;
  sub: string;
}

function Card({ label, value, sub }: CardProps) {
  return (
    <div className={`${CARD_BASE} p-5`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

interface SummaryCardsProps {
  summary: MetricsSummary | null;
  loading: boolean;
}

export default function SummaryCards({ summary, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-28 rounded-2xl border border-slate-200"
          />
        ))}
      </div>
    );
  }

  const cards: CardProps[] = [
    {
      label: "Total Premium",
      value: summary ? fmt(summary.total_premium, "currency") : "?",
      sub: "All time",
    },
    {
      label: "Annualized Return",
      value: summary ? fmt(summary.annualized_return, "percent") : "?",
      sub: "Capital deployed",
    },
    {
      label: "Active Positions",
      value: summary ? String(summary.active_positions) : "?",
      sub: "CSP + CC",
    },
    {
      label: "Win Rate",
      value: summary ? fmt(summary.win_rate, "percent") : "?",
      sub: "Expired OTM",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} {...c} />
      ))}
    </div>
  );
}
