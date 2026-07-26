import type { Locale } from "@/lib/i18n/locales";
import type { LearnFigureKind } from "@/lib/learn/types";

interface LearnFigureProps {
  kind: LearnFigureKind;
  locale: Locale;
  caption?: string;
}

interface PayoffLabels {
  xAxis: string;
  yAxis: string;
  profit: string;
  loss: string;
  strike: string;
  premium: string;
}

function payoffLabels(locale: Locale): PayoffLabels {
  if (locale === "zh") {
    return {
      xAxis: "到期时标的价格",
      yAxis: "盈亏",
      profit: "盈利",
      loss: "亏损",
      strike: "行权价",
      premium: "权利金",
    };
  }
  return {
    xAxis: "Underlying price at expiration",
    yAxis: "Profit / Loss",
    profit: "Profit",
    loss: "Loss",
    strike: "Strike",
    premium: "Premium",
  };
}

// Shared plot geometry.
const W = 360;
const H = 224;
const PLOT_LEFT = 50;
const PLOT_RIGHT = 336;
const PLOT_TOP = 20;
const PLOT_BOTTOM = 172;
const ZERO_Y = 118;
const STRIKE_X = 178;

const AXIS = "#cbd5e1"; // slate-300
const GRID = "#94a3b8"; // slate-400
const PROFIT_LINE = "#059669"; // emerald-600
const TEXT_MUTED = "#64748b"; // slate-500
const TEXT_STRONG = "#334155"; // slate-700

function PayoffFrame({
  labels,
  children,
}: {
  labels: PayoffLabels;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      className="mx-auto h-auto w-full max-w-md"
    >
      {/* Zero profit line */}
      <line
        x1={PLOT_LEFT}
        y1={ZERO_Y}
        x2={PLOT_RIGHT}
        y2={ZERO_Y}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      {/* Y axis */}
      <line
        x1={PLOT_LEFT}
        y1={PLOT_TOP}
        x2={PLOT_LEFT}
        y2={PLOT_BOTTOM}
        stroke={AXIS}
        strokeWidth={1.5}
      />
      {/* Strike marker */}
      <line
        x1={STRIKE_X}
        y1={PLOT_TOP}
        x2={STRIKE_X}
        y2={PLOT_BOTTOM}
        stroke={AXIS}
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      <text x={STRIKE_X} y={PLOT_BOTTOM + 16} textAnchor="middle" fontSize="11" fill={TEXT_STRONG}>
        {labels.strike}
      </text>
      {/* Profit / loss hints on the y axis */}
      <text x={PLOT_LEFT - 8} y={PLOT_TOP + 10} textAnchor="end" fontSize="10" fill={TEXT_MUTED}>
        {labels.profit}
      </text>
      <text x={PLOT_LEFT - 8} y={PLOT_BOTTOM} textAnchor="end" fontSize="10" fill={TEXT_MUTED}>
        {labels.loss}
      </text>
      {children}
      {/* Axis titles */}
      <text x={(PLOT_LEFT + PLOT_RIGHT) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill={TEXT_MUTED}>
        {labels.xAxis}
      </text>
      <text
        x={14}
        y={(PLOT_TOP + PLOT_BOTTOM) / 2}
        textAnchor="middle"
        fontSize="11"
        fill={TEXT_MUTED}
        transform={`rotate(-90 14 ${(PLOT_TOP + PLOT_BOTTOM) / 2})`}
      >
        {labels.yAxis}
      </text>
    </svg>
  );
}

function PayoffDiagram({ kind, locale }: { kind: Exclude<LearnFigureKind, "contract-anatomy">; locale: Locale }) {
  const labels = payoffLabels(locale);

  // Each diagram is a 3-point hockey-stick relative to strike and premium.
  const shapes: Record<typeof kind, { points: string; premiumX: number; premiumY: number; premiumText: string }> = {
    "long-call": {
      points: `${PLOT_LEFT},144 ${STRIKE_X},144 ${PLOT_RIGHT},54`,
      premiumX: PLOT_LEFT + 8,
      premiumY: 138,
      premiumText: `- ${labels.premium}`,
    },
    "long-put": {
      points: `${PLOT_LEFT},60 ${STRIKE_X},144 ${PLOT_RIGHT},144`,
      premiumX: PLOT_RIGHT - 8,
      premiumY: 138,
      premiumText: `- ${labels.premium}`,
    },
    "short-put": {
      points: `${PLOT_LEFT},168 ${STRIKE_X},92 ${PLOT_RIGHT},92`,
      premiumX: PLOT_RIGHT - 8,
      premiumY: 86,
      premiumText: `+ ${labels.premium}`,
    },
  };

  const shape = shapes[kind];
  const premiumAnchor = shape.premiumX > (PLOT_LEFT + PLOT_RIGHT) / 2 ? "end" : "start";

  return (
    <PayoffFrame labels={labels}>
      <polyline points={shape.points} fill="none" stroke={PROFIT_LINE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <text x={shape.premiumX} y={shape.premiumY} textAnchor={premiumAnchor} fontSize="10" fill={TEXT_MUTED}>
        {shape.premiumText}
      </text>
    </PayoffFrame>
  );
}

function ContractAnatomy({ locale }: { locale: Locale }) {
  const tokens =
    locale === "zh"
      ? [
          { value: "TSLA", label: "标的" },
          { value: "$260", label: "行权价" },
          { value: "Call", label: "类型" },
          { value: "01/16", label: "到期" },
        ]
      : [
          { value: "TSLA", label: "Underlying" },
          { value: "$260", label: "Strike" },
          { value: "Call", label: "Type" },
          { value: "01/16", label: "Expiration" },
        ];

  const note =
    locale === "zh"
      ? "1 张合约 = 100 股 · 权利金 $3.20 = 每张 $320"
      : "1 contract = 100 shares · premium $3.20 = $320 per contract";

  return (
    <div className="mx-auto max-w-md">
      <div className="flex flex-wrap items-stretch justify-center gap-2">
        {tokens.map((token) => (
          <div
            key={token.label}
            className="flex min-w-[68px] flex-col items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-center"
          >
            <span className="text-base font-semibold text-slate-900">{token.value}</span>
            <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
              {token.label}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">{note}</p>
    </div>
  );
}

export default function LearnFigure({ kind, locale, caption }: LearnFigureProps) {
  return (
    <figure className="my-6 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-5">
      {kind === "contract-anatomy" ? (
        <ContractAnatomy locale={locale} />
      ) : (
        <PayoffDiagram kind={kind} locale={locale} />
      )}
      {caption ? (
        <figcaption className="mt-3 text-center text-xs text-slate-500">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
