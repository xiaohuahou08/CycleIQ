"use client";

import { useEffect, useMemo, useState } from "react";
import type { Trade } from "@/lib/api/trades";
import {
  ModalActionButtons,
  OptionalFieldsCard,
  OptionalFieldsToggle,
  TradeModalShell,
} from "../../components/TradeModalShared";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  );
}

interface AssignTradeModalProps {
  open: boolean;
  trade: Trade | null;
  onClose: () => void;
  onConfirm: (input: {
    trade_date: string;
    assignment_price: number;
    /** Total USD for assignment-related fees (optional). */
    fees_on_assignment?: number;
    /** Net premium/share earned from prior rolls (e.g. rolling 375→390). */
    prior_roll_premium_per_share?: number;
    notes?: string;
  }) => Promise<void>;
}

export default function AssignTradeModal({
  open,
  trade,
  onClose,
  onConfirm,
}: AssignTradeModalProps) {
  const [actionDate, setActionDate] = useState(todayIso());
  const [assignmentPrice, setAssignmentPrice] = useState("");
  const [showOptionalFields, setShowOptionalFields] = useState(true);
  const [fees, setFees] = useState("");
  const [priorRollPremium, setPriorRollPremium] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActionDate(todayIso());
    setAssignmentPrice(
      trade ? (Number.isFinite(trade.strike) ? String(trade.strike) : "")
      : ""
    );
    setShowOptionalFields(true);
    setFees("");
    setPriorRollPremium("");
    setNotes("");
  }, [open, trade?.id, trade?.strike]);

  const strategyLabel = useMemo(() => {
    if (!trade) return "";
    return trade.option_type === "PUT" ? "Cash Secured Put" : "Covered Call";
  }, [trade]);

  const subtitle = useMemo(() => {
    if (!trade) return "";
    return trade.option_type === "PUT"
      ? "Record that this short put was assigned into shares."
      : "Record that this covered call was assigned (shares called away).";
  }, [trade]);

  const shares = trade ? trade.contracts * 100 : 0;
  const priceNum = Number.parseFloat(assignmentPrice.replace(",", "."));
  const totalValue =
    trade && Number.isFinite(priceNum) ? priceNum * shares : 0;

  const parsedAssignmentFeesUsd = useMemo(() => {
    const t = fees.trim();
    if (!t) return undefined;
    const x = Number(t);
    if (!Number.isFinite(x) || x < 0) return undefined;
    return x;
  }, [fees]);

  const parsedPriorRollPremium = useMemo(() => {
    const t = priorRollPremium.trim();
    if (!t) return undefined;
    const x = Number(t);
    if (!Number.isFinite(x) || x < 0) return undefined;
    return x;
  }, [priorRollPremium]);

  /**
   * CSP cost basis (mirrors backend `apply_stock_cost_basis`):
   *   strike − premium_this_leg − prior_roll_premium + (opening_fees + assign_fees) / shares
   */
  const estimatedStockCostPerShare = useMemo(() => {
    if (!trade || trade.option_type !== "PUT") return null;
    if (!Number.isFinite(priceNum) || priceNum <= 0 || shares <= 0) return null;
    const openFee = trade.commission_fee ?? 0;
    const assignPart = parsedAssignmentFeesUsd ?? 0;
    const rollPart = parsedPriorRollPremium ?? 0;
    return priceNum - trade.premium - rollPart + (openFee + assignPart) / shares;
  }, [trade, priceNum, shares, parsedAssignmentFeesUsd, parsedPriorRollPremium]);

  if (!open || !trade) return null;

  const handleSubmit = async () => {
    if (!Number.isFinite(priceNum) || priceNum <= 0) return;
    const t = fees.trim();
    let feesAssignmentOut: number | undefined;
    if (t) {
      const x = Number(t);
      if (!Number.isFinite(x) || x < 0) return;
      feesAssignmentOut = x;
    }
    setIsSubmitting(true);
    try {
      await onConfirm({
        trade_date: actionDate,
        assignment_price: priceNum,
        ...(feesAssignmentOut !== undefined ? { fees_on_assignment: feesAssignmentOut } : {}),
        ...(parsedPriorRollPremium !== undefined ? { prior_roll_premium_per_share: parsedPriorRollPremium } : {}),
        notes: notes.trim() ? notes.trim() : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TradeModalShell
      open={open}
      title="Mark as Assigned"
      subtitle={subtitle}
      headerIcon={<PackageIcon />}
      onClose={onClose}
      labelledById="assign-trade-title"
    >
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Position</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold text-gray-900">{trade.ticker}</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {strategyLabel}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Strike</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                ${trade.strike.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contracts</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{trade.contracts}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Shares</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{shares}</p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <label
            htmlFor="assign_action_date"
            className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700"
          >
            <svg
              className="h-4 w-4 text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Action Date
          </label>
          <input
            id="assign_action_date"
            type="date"
            value={actionDate}
            onChange={(e) => setActionDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="mt-5">
          <label
            htmlFor="assign_price"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Assignment Price
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              $
            </span>
            <input
              id="assign_price"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={assignmentPrice}
              onChange={(e) => setAssignmentPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Total value:{" "}
            <span className="font-semibold text-gray-700">
              $
              {totalValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
          {trade.option_type === "PUT" && estimatedStockCostPerShare != null ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Est. stock cost per share (CSP)
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-900">
                $
                {estimatedStockCostPerShare.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </p>
              <p className="mt-2 text-xs text-emerald-800">
                Strike − premium/share
                {parsedPriorRollPremium ? ` − roll premium ($${parsedPriorRollPremium.toFixed(2)}/sh)` : ""}
                {" "}+ (opening commission + assignment fees) ÷ shares.
              </p>
            </div>
          ) : null}
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
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-800">
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Optional Details
              </p>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="assign_fees" className="text-sm font-medium text-gray-700">
                    Assignment fees
                  </label>
                  <span className="text-sm text-gray-500">optional</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Total USD for this assignment (not spread per share).</p>
                <input
                  id="assign_fees"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  placeholder="0.00"
                  className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-400 focus:outline-none"
                />
              </div>

              {trade.option_type === "PUT" && trade.rolled_from_id && (
                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
                  <span className="font-semibold">Roll chain detected.</span>{" "}
                  Prior roll premiums will be automatically added to cost basis from the linked chain.
                  Use the override below only if you need to adjust.
                </div>
              )}
              {trade.option_type === "PUT" && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="assign_prior_roll" className="text-sm font-medium text-gray-700">
                      Prior roll premium / share override
                    </label>
                    <span className="text-sm text-gray-500">optional</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Leave blank to auto-sum from the roll chain. Fill in only to override (e.g. for manually linked trades).
                  </p>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                    <input
                      id="assign_prior_roll"
                      type="number"
                      step="0.01"
                      min="0"
                      value={priorRollPremium}
                      onChange={(e) => setPriorRollPremium(e.target.value)}
                      placeholder="auto from chain"
                      className="w-full rounded-lg border border-purple-200 bg-white py-2 pl-7 pr-3 text-sm text-gray-900 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="assign_notes" className="text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <span className="text-sm text-gray-500">optional</span>
                </div>
                <textarea
                  id="assign_notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add optional notes about this lifecycle event..."
                  className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-400 focus:outline-none"
                />
              </div>
            </OptionalFieldsCard>
          </div>
        )}

        <ModalActionButtons
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel="Mark Assigned"
          submittingLabel="Saving..."
          isSubmitting={isSubmitting}
          submitTone="blue"
          submitDisabled={!Number.isFinite(priceNum) || priceNum <= 0}
        />
      </div>
    </TradeModalShell>
  );
}
