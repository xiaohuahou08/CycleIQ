"use client";

import { useEffect, useMemo, useState } from "react";
import type { Trade } from "@/lib/api/trades";
import {
  ModalActionButtons,
  OptionalFieldsCard,
  OptionalFieldsToggle,
  TradeModalShell,
} from "../../components/TradeModalShared";

interface RollTradeModalProps {
  open: boolean;
  trade: Trade | null;
  onClose: () => void;
  onConfirm: (input: {
    trade_date: string;
    new_expiry: string;
    new_strike: number;
    new_premium_per_share: number;
    buyback_cost_per_share: number;
    notes?: string;
    fees?: number;
  }) => Promise<void>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function RollIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8" />
      <path d="M20 4v4h-4" />
      <path d="M20 12a8 8 0 0 1-13.66 5.66L4 16" />
      <path d="M4 20v-4h4" />
    </svg>
  );
}

export default function RollTradeModal({
  open,
  trade,
  onClose,
  onConfirm,
}: RollTradeModalProps) {
  const [rollDate, setRollDate] = useState(todayIso());
  const [newExpiry, setNewExpiry] = useState("");
  const [newStrike, setNewStrike] = useState("");
  const [newPremium, setNewPremium] = useState("");
  const [buybackCost, setBuybackCost] = useState("0.50");
  const [showOptionalFields, setShowOptionalFields] = useState(true);
  const [fees, setFees] = useState("0.00");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !trade) return;
    setRollDate(todayIso());
    setNewExpiry(trade.expiry);
    setNewStrike(trade.strike.toFixed(2));
    setNewPremium(Math.abs(trade.premium).toFixed(2));
    setBuybackCost("0.50");
    setShowOptionalFields(true);
    setFees("0.00");
    setNotes("");
  }, [open, trade?.id, trade?.expiry, trade?.strike, trade?.premium]);

  const strikeNum = Number(newStrike);
  const premiumNum = Number(newPremium);
  const buybackNum = Number(buybackCost || 0);
  const feesNum = Number(fees || 0);
  const shares = (trade?.contracts ?? 0) * 100;

  const netPremiumPerShare = useMemo(() => {
    if (!Number.isFinite(premiumNum) || !Number.isFinite(buybackNum)) return null;
    return premiumNum - buybackNum;
  }, [premiumNum, buybackNum]);

  const rollTypeText = useMemo(() => {
    if (!trade) return "Fill in the strike & expiration above to auto-detect";
    const parts: string[] = [];
    if (newExpiry && newExpiry !== trade.expiry) parts.push("to new expiry");
    if (Number.isFinite(strikeNum) && strikeNum !== trade.strike) parts.push("to new strike");
    if (parts.length === 0) return "No change detected";
    return `Roll ${parts.join(" and ")}`;
  }, [newExpiry, strikeNum, trade]);

  if (!open || !trade) return null;

  const canSubmit =
    newExpiry.trim() !== "" &&
    Number.isFinite(strikeNum) &&
    strikeNum > 0 &&
    Number.isFinite(premiumNum) &&
    premiumNum >= 0 &&
    Number.isFinite(buybackNum) &&
    buybackNum >= 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onConfirm({
        trade_date: rollDate,
        new_expiry: newExpiry,
        new_strike: strikeNum,
        new_premium_per_share: premiumNum,
        buyback_cost_per_share: buybackNum,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(Number.isFinite(feesNum) && feesNum > 0 ? { fees: feesNum } : {}),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TradeModalShell
      open={open}
      title="Roll Position"
      subtitle={`Roll your ${trade.ticker} ${trade.option_type === "PUT" ? "Cash Secured Put" : "Covered Call"} to a new strike or expiration.`}
      headerIcon={<RollIcon />}
      onClose={onClose}
      labelledById="roll-trade-title"
    >
      <div className="max-h-[78vh] overflow-y-auto px-6 py-5">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Current Position</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl font-semibold text-gray-900">{trade.ticker}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {trade.option_type === "PUT" ? "Cash Secured Put" : "Covered Call"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Strike</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">${trade.strike.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Premium</p>
              <p className="mt-1 text-3xl font-semibold text-emerald-600">
                +${(trade.premium * trade.contracts * 100).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Expires</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{trade.expiry}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="roll_date" className="mb-1 block text-sm font-medium text-gray-700">
              Roll Date
            </label>
            <input
              id="roll_date"
              type="date"
              value={rollDate}
              onChange={(e) => setRollDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label htmlFor="roll_expiry" className="mb-1 block text-sm font-medium text-gray-700">
              New Expiration
            </label>
            <input
              id="roll_expiry"
              type="date"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label htmlFor="roll_strike" className="mb-1 block text-sm font-medium text-gray-700">
              New Strike Price
            </label>
            <input
              id="roll_strike"
              type="number"
              step="0.01"
              min="0"
              value={newStrike}
              onChange={(e) => setNewStrike(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label htmlFor="roll_premium" className="mb-1 block text-sm font-medium text-gray-700">
              New Premium / Share
            </label>
            <input
              id="roll_premium"
              type="number"
              step="0.01"
              min="0"
              value={newPremium}
              onChange={(e) => setNewPremium(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Per share - auto-multiplied by contracts × 100</p>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="roll_buyback" className="mb-1 block text-sm font-medium text-gray-700">
            Buyback Cost / Share
          </label>
          <input
            id="roll_buyback"
            type="number"
            step="0.01"
            min="0"
            value={buybackCost}
            onChange={(e) => setBuybackCost(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <p className="mt-1 text-xs text-gray-500">Per share - cost to close original</p>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-sm font-medium text-gray-700">Roll Type</p>
          <p className="mt-1 text-sm text-gray-500">{rollTypeText}</p>
          <p className="mt-1 text-xs text-emerald-700">
            Net premium / share:{" "}
            {netPremiumPerShare != null
              ? `$${netPremiumPerShare.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "-"}
          </p>
          <p className="text-xs text-gray-500">
            Net premium total:{" "}
            {netPremiumPerShare != null
              ? `$${(netPremiumPerShare * shares).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "-"}
          </p>
        </div>

        <div className="mt-4">
          <OptionalFieldsToggle
            open={showOptionalFields}
            onToggle={() => setShowOptionalFields((v) => !v)}
          />
        </div>

        {showOptionalFields && (
          <div className="mt-4">
            <OptionalFieldsCard>
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-800">
                Optional Details
              </p>
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="roll_fees" className="text-sm font-medium text-gray-700">
                    Fees
                  </label>
                  <span className="text-sm text-gray-500">optional</span>
                </div>
                <input
                  id="roll_fees"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  placeholder="$ 0.00"
                  className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="roll_notes" className="text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <span className="text-sm text-gray-500">optional</span>
                </div>
                <textarea
                  id="roll_notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for rolling..."
                  className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-400 focus:outline-none"
                />
              </div>
            </OptionalFieldsCard>
          </div>
        )}

        <ModalActionButtons
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel="Roll Position"
          submittingLabel="Rolling..."
          isSubmitting={isSubmitting}
          submitTone="blue"
          submitDisabled={!canSubmit}
        />
      </div>
    </TradeModalShell>
  );
}
