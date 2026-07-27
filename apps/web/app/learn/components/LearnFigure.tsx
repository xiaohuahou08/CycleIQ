import type { Locale } from "@/lib/i18n/locales";
import type { LearnFigureKind } from "@/lib/learn/types";

type PayoffKind = "long-call" | "long-put" | "short-put" | "short-call";
type DeltaKind = "delta-slope" | "delta-curve";

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

function PayoffDiagram({ kind, locale }: { kind: PayoffKind; locale: Locale }) {
  const labels = payoffLabels(locale);

  // Each diagram is a 3-point hockey-stick relative to strike and premium.
  const shapes: Record<PayoffKind, { points: string; premiumX: number; premiumY: number; premiumText: string }> = {
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
    "short-call": {
      points: `${PLOT_LEFT},92 ${STRIKE_X},92 ${PLOT_RIGHT},168`,
      premiumX: PLOT_LEFT + 8,
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

interface DeltaLabels {
  price: string;
  optionValue: string;
  delta: string;
  slope: string;
  strike: string;
  otm: string;
  atm: string;
  itm: string;
}

function deltaLabels(locale: Locale): DeltaLabels {
  if (locale === "zh") {
    return {
      price: "标的价格",
      optionValue: "期权价格",
      delta: "Delta（Δ）",
      slope: "斜率 = Delta",
      strike: "行权价",
      otm: "价外",
      atm: "平价",
      itm: "价内",
    };
  }
  return {
    price: "Underlying price",
    optionValue: "Option price",
    delta: "Delta (Δ)",
    slope: "slope = delta",
    strike: "Strike",
    otm: "OTM",
    atm: "ATM",
    itm: "ITM",
  };
}

function DeltaFrame({
  xAxis,
  yAxis,
  children,
}: {
  xAxis: string;
  yAxis: string;
  children: React.ReactNode;
}) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="mx-auto h-auto w-full max-w-md">
      {/* X axis baseline */}
      <line x1={PLOT_LEFT} y1={PLOT_BOTTOM} x2={PLOT_RIGHT} y2={PLOT_BOTTOM} stroke={AXIS} strokeWidth={1.5} />
      {/* Y axis */}
      <line x1={PLOT_LEFT} y1={PLOT_TOP} x2={PLOT_LEFT} y2={PLOT_BOTTOM} stroke={AXIS} strokeWidth={1.5} />
      {children}
      <text x={(PLOT_LEFT + PLOT_RIGHT) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill={TEXT_MUTED}>
        {xAxis}
      </text>
      <text
        x={14}
        y={(PLOT_TOP + PLOT_BOTTOM) / 2}
        textAnchor="middle"
        fontSize="11"
        fill={TEXT_MUTED}
        transform={`rotate(-90 14 ${(PLOT_TOP + PLOT_BOTTOM) / 2})`}
      >
        {yAxis}
      </text>
    </svg>
  );
}

function DeltaDiagram({ kind, locale }: { kind: DeltaKind; locale: Locale }) {
  const labels = deltaLabels(locale);

  if (kind === "delta-curve") {
    // Call delta S-curve rising from ~0 (OTM) through 0.5 (ATM) to ~1 (ITM).
    const yFor = (d: number) => PLOT_BOTTOM - d * (PLOT_BOTTOM - (PLOT_TOP + 8));
    return (
      <DeltaFrame xAxis={labels.price} yAxis={labels.delta}>
        {[0, 0.5, 1].map((d) => (
          <g key={d}>
            <line
              x1={PLOT_LEFT}
              y1={yFor(d)}
              x2={PLOT_RIGHT}
              y2={yFor(d)}
              stroke={GRID}
              strokeWidth={0.75}
              strokeDasharray="3 4"
            />
            <text x={PLOT_LEFT - 6} y={yFor(d) + 3} textAnchor="end" fontSize="9" fill={TEXT_MUTED}>
              {d === 1 ? "1.0" : d.toString()}
            </text>
          </g>
        ))}
        {/* Strike / ATM marker */}
        <line x1={STRIKE_X} y1={PLOT_TOP} x2={STRIKE_X} y2={PLOT_BOTTOM} stroke={AXIS} strokeWidth={1} strokeDasharray="3 4" />
        <path
          d={`M${PLOT_LEFT},${yFor(0.05)} C110,${yFor(0.1)} 150,${yFor(0.25)} ${STRIKE_X},${yFor(0.5)} S250,${yFor(0.9)} ${PLOT_RIGHT},${yFor(0.95)}`}
          fill="none"
          stroke={PROFIT_LINE}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={STRIKE_X} cy={yFor(0.5)} r={3.5} fill={PROFIT_LINE} />
        <text x={95} y={PLOT_BOTTOM + 15} textAnchor="middle" fontSize="10" fill={TEXT_MUTED}>
          {labels.otm}
        </text>
        <text x={STRIKE_X} y={PLOT_BOTTOM + 15} textAnchor="middle" fontSize="10" fill={TEXT_STRONG}>
          {labels.atm}
        </text>
        <text x={300} y={PLOT_BOTTOM + 15} textAnchor="middle" fontSize="10" fill={TEXT_MUTED}>
          {labels.itm}
        </text>
      </DeltaFrame>
    );
  }

  // delta-slope: option value curve with a tangent line whose slope is delta.
  return (
    <DeltaFrame xAxis={labels.price} yAxis={labels.optionValue}>
      <path
        d={`M${PLOT_LEFT},158 C150,156 210,128 ${PLOT_RIGHT},52`}
        fill="none"
        stroke={PROFIT_LINE}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* Tangent line at a point on the curve */}
      <line x1={196} y1={124} x2={300} y2={58} stroke={TEXT_STRONG} strokeWidth={1.5} strokeDasharray="5 4" />
      <circle cx={248} cy={91} r={3.5} fill={TEXT_STRONG} />
      <text x={262} y={86} textAnchor="start" fontSize="10" fill={TEXT_STRONG}>
        {labels.slope}
      </text>
    </DeltaFrame>
  );
}

interface GreekBellLabels {
  price: string;
  yAxis: string;
  otm: string;
  atm: string;
  itm: string;
  moreTime?: string;
  lessTime?: string;
}

function greekBellLabels(kind: "gamma-curve" | "vega-curve", locale: Locale): GreekBellLabels {
  const zh = locale === "zh";
  if (kind === "gamma-curve") {
    return {
      price: zh ? "标的价格" : "Underlying price",
      yAxis: zh ? "Gamma（Γ）" : "Gamma (Γ)",
      otm: zh ? "价外" : "OTM",
      atm: zh ? "平价" : "ATM",
      itm: zh ? "价内" : "ITM",
    };
  }
  return {
    price: zh ? "标的价格" : "Underlying price",
    yAxis: zh ? "Vega（ν）" : "Vega (ν)",
    otm: zh ? "价外" : "OTM",
    atm: zh ? "平价" : "ATM",
    itm: zh ? "价内" : "ITM",
    moreTime: zh ? "到期更远" : "more time",
    lessTime: zh ? "到期更近" : "less time",
  };
}

// Both gamma and vega peak at the money and taper toward deep ITM/OTM: a bell.
function GreekBellDiagram({
  kind,
  locale,
}: {
  kind: "gamma-curve" | "vega-curve";
  locale: Locale;
}) {
  const labels = greekBellLabels(kind, locale);
  const tallBell = `M${PLOT_LEFT},162 C120,160 156,54 ${STRIKE_X},54 C200,54 236,160 ${PLOT_RIGHT},162`;
  const shortBell = `M${PLOT_LEFT},164 C124,162 158,104 ${STRIKE_X},104 C198,104 232,162 ${PLOT_RIGHT},164`;

  return (
    <DeltaFrame xAxis={labels.price} yAxis={labels.yAxis}>
      {/* ATM marker */}
      <line x1={STRIKE_X} y1={PLOT_TOP} x2={STRIKE_X} y2={PLOT_BOTTOM} stroke={AXIS} strokeWidth={1} strokeDasharray="3 4" />
      {kind === "vega-curve" ? (
        <path d={shortBell} fill="none" stroke={GRID} strokeWidth={1.75} strokeDasharray="5 4" strokeLinecap="round" />
      ) : null}
      <path d={tallBell} fill="none" stroke={PROFIT_LINE} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={STRIKE_X} cy={54} r={3.5} fill={PROFIT_LINE} />
      {kind === "vega-curve" ? (
        <>
          <text x={STRIKE_X + 10} y={52} textAnchor="start" fontSize="10" fill={TEXT_STRONG}>
            {labels.moreTime}
          </text>
          <text x={STRIKE_X + 10} y={102} textAnchor="start" fontSize="10" fill={TEXT_MUTED}>
            {labels.lessTime}
          </text>
        </>
      ) : null}
      <text x={95} y={PLOT_BOTTOM + 15} textAnchor="middle" fontSize="10" fill={TEXT_MUTED}>
        {labels.otm}
      </text>
      <text x={STRIKE_X} y={PLOT_BOTTOM + 15} textAnchor="middle" fontSize="10" fill={TEXT_STRONG}>
        {labels.atm}
      </text>
      <text x={300} y={PLOT_BOTTOM + 15} textAnchor="middle" fontSize="10" fill={TEXT_MUTED}>
        {labels.itm}
      </text>
    </DeltaFrame>
  );
}

function RhoDiagram({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const xAxis = zh ? "利率" : "Interest rate";
  const yAxis = zh ? "期权价格" : "Option price";
  const callLabel = zh ? "看涨（Rho > 0）" : "Call (rho > 0)";
  const putLabel = zh ? "看跌（Rho < 0）" : "Put (rho < 0)";

  return (
    <DeltaFrame xAxis={xAxis} yAxis={yAxis}>
      {/* Call: value rises with rates */}
      <line x1={PLOT_LEFT} y1={148} x2={PLOT_RIGHT} y2={52} stroke={PROFIT_LINE} strokeWidth={2.5} strokeLinecap="round" />
      <text x={PLOT_RIGHT - 4} y={46} textAnchor="end" fontSize="10" fill={PROFIT_LINE}>
        {callLabel}
      </text>
      {/* Put: value falls with rates */}
      <line x1={PLOT_LEFT} y1={60} x2={PLOT_RIGHT} y2={152} stroke={TEXT_STRONG} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
      <text x={PLOT_RIGHT - 4} y={166} textAnchor="end" fontSize="10" fill={TEXT_STRONG}>
        {putLabel}
      </text>
    </DeltaFrame>
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

// Compact, text-free version used as a list thumbnail.
export function LearnThumbnail({ kind }: { kind: LearnFigureKind }) {
  // 120 x 84 viewBox with a small padding.
  const zY = 50;
  const kX = 60;
  const payoffPoints: Record<PayoffKind, string> = {
    "long-call": `14,64 ${kX},64 106,20`,
    "long-put": `14,20 ${kX},64 106,64`,
    "short-put": `14,72 ${kX},36 106,36`,
    "short-call": `14,36 ${kX},36 106,72`,
  };

  const renderInner = () => {
    if (kind === "contract-anatomy") {
      return (
        <g>
          {[18, 46, 74].map((x) => (
            <rect
              key={x}
              x={x}
              y={30}
              width="24"
              height="24"
              rx="5"
              fill="#ffffff"
              stroke={AXIS}
              strokeWidth={1.5}
            />
          ))}
          <line x1="30" y1="42" x2="86" y2="42" stroke={PROFIT_LINE} strokeWidth={1.5} strokeDasharray="3 3" />
        </g>
      );
    }

    if (kind === "delta-curve") {
      return (
        <g>
          <line x1="14" y1="66" x2="106" y2="66" stroke={GRID} strokeWidth={0.75} strokeDasharray="3 3" />
          <path d="M14,68 C40,64 52,54 60,42 S86,20 106,17" fill="none" stroke={PROFIT_LINE} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx="60" cy="42" r="3" fill={PROFIT_LINE} />
        </g>
      );
    }

    if (kind === "delta-slope") {
      return (
        <g>
          <path d="M14,68 C48,66 70,50 106,20" fill="none" stroke={PROFIT_LINE} strokeWidth={2.5} strokeLinecap="round" />
          <line x1="46" y1="62" x2="94" y2="30" stroke={TEXT_STRONG} strokeWidth={1.5} strokeDasharray="4 3" />
          <circle cx="70" cy="46" r="3" fill={TEXT_STRONG} />
        </g>
      );
    }

    if (kind === "gamma-curve" || kind === "vega-curve") {
      return (
        <g>
          <line x1={kX} y1="14" x2={kX} y2="70" stroke={AXIS} strokeWidth={1} strokeDasharray="2 3" />
          {kind === "vega-curve" ? (
            <path d="M14,70 C36,68 48,48 60,48 C72,48 84,68 106,70" fill="none" stroke={GRID} strokeWidth={1.5} strokeDasharray="4 3" strokeLinecap="round" />
          ) : null}
          <path d="M14,68 C38,66 50,22 60,22 C70,22 82,66 106,68" fill="none" stroke={PROFIT_LINE} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx="60" cy="22" r="3" fill={PROFIT_LINE} />
        </g>
      );
    }

    if (kind === "rho-line") {
      return (
        <g>
          <line x1="14" y1="60" x2="106" y2="22" stroke={PROFIT_LINE} strokeWidth={2.5} strokeLinecap="round" />
          <line x1="14" y1="24" x2="106" y2="62" stroke={TEXT_STRONG} strokeWidth={2} strokeDasharray="5 3" strokeLinecap="round" />
        </g>
      );
    }

    return (
      <g>
        <line x1="14" y1={zY} x2="106" y2={zY} stroke={GRID} strokeWidth={1} strokeDasharray="3 3" />
        <line x1={kX} y1="14" x2={kX} y2="70" stroke={AXIS} strokeWidth={1} strokeDasharray="2 3" />
        <polyline
          points={payoffPoints[kind]}
          fill="none"
          stroke={PROFIT_LINE}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
    );
  };

  return (
    <svg viewBox="0 0 120 84" role="presentation" aria-hidden="true" className="h-full w-full">
      <rect x="0" y="0" width="120" height="84" rx="8" fill="#f8fafc" />
      {renderInner()}
    </svg>
  );
}

function renderFigure(kind: LearnFigureKind, locale: Locale) {
  if (kind === "contract-anatomy") return <ContractAnatomy locale={locale} />;
  if (kind === "delta-slope" || kind === "delta-curve") {
    return <DeltaDiagram kind={kind} locale={locale} />;
  }
  if (kind === "gamma-curve" || kind === "vega-curve") {
    return <GreekBellDiagram kind={kind} locale={locale} />;
  }
  if (kind === "rho-line") return <RhoDiagram locale={locale} />;
  return <PayoffDiagram kind={kind} locale={locale} />;
}

export default function LearnFigure({ kind, locale, caption }: LearnFigureProps) {
  return (
    <figure className="my-6 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-5">
      {renderFigure(kind, locale)}
      {caption ? (
        <figcaption className="mt-3 text-center text-xs text-slate-500">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
