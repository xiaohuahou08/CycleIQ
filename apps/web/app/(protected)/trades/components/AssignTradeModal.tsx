"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Layers, Package } from "lucide-react";
import { iconMd, iconSm, iconStroke } from "@/app/components/icons";
import type { Trade } from "@/lib/api/trades";
import { useTranslations } from "@/lib/i18n/locale-context";
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
  return <Package className={iconMd} strokeWidth={iconStroke} aria-hidden />;
}

interface AssignTradeModalProps {
  open: boolean;
  trade: Trade | null;
  onClose: () => void;
  onConfirm: (input: {
    trade_date: string;
    assignment_price: number;
    fees_on_assignment?: number;
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
  const { t } = useTranslations("trades");
  const { t: tCommon } = useTranslations("common");
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
    return trade.option_type === "PUT"
      ? tCommon("strategy.cspFull")
      : tCommon("strategy.ccFull");
  }, [trade, tCommon]);

  const subtitle = useMemo(() => {
    if (!trade) return "";
    return trade.option_type === "PUT" ? t("assign.subtitlePut") : t("assign.subtitleCall");
  }, [trade, t]);

  const shares = trade ? trade.contracts * 100 : 0;
  const priceNum = Number.parseFloat(assignmentPrice.replace(",", "."));
  const totalValue =
    trade && Number.isFinite(priceNum) ? priceNum * shares : 0;

  const parsedAssignmentFeesUsd = useMemo(() => {
    const feeText = fees.trim();
    if (!feeText) return undefined;
    const x = Number(feeText);
    if (!Number.isFinite(x) || x < 0) return undefined;
    return x;
  }, [fees]);

  const parsedPriorRollPremium = useMemo(() => {
    const rollText = priorRollPremium.trim();
    if (!rollText) return undefined;
    const x = Number(rollText);
    if (!Number.isFinite(x) || x < 0) return undefined;
    return x;
  }, [priorRollPremium]);

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
    const feeText = fees.trim();
    let feesAssignmentOut: number | undefined;
    if (feeText) {
      const x = Number(feeText);
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

  const modalTitle =
    trade?.option_type === "CALL" ? t("assign.titleCallAway") : t("assign.titleAssign");

  const rollPartFormula = parsedPriorRollPremium
    ? ` − roll premium ($${parsedPriorRollPremium.toFixed(2)}/sh)`
    : "";

  return (
    <TradeModalShell
      open={open}
      title={modalTitle}
      subtitle={subtitle}
      headerIcon={<PackageIcon />}
      onClose={onClose}
      labelledById="assign-trade-title"
    >
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("assign.position")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold text-slate-900">{trade.ticker}</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {strategyLabel}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tCommon("columns.strike")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                ${trade.strike.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("form.contracts")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{trade.contracts}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("assign.shares")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{shares}</p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <label
            htmlFor="assign_action_date"
            className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700"
          >
            <Calendar className={`${iconSm} text-slate-500`} strokeWidth={iconStroke} aria-hidden />
            {t("assign.actionDate")}
          </label>
          <input
            id="assign_action_date"
            type="date"
            value={actionDate}
            onChange={(e) => setActionDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="mt-5">
          <label
            htmlFor="assign_price"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            {trade.option_type === "CALL" ? t("assign.callAwayPrice") : t("assign.assignmentPrice")}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
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
              className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {t("assign.totalValue")}{" "}
            <span className="font-semibold text-slate-700">
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
                {t("assign.estCostLabel")}
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-900">
                $
                {estimatedStockCostPerShare.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </p>
              <p className="mt-2 text-xs text-emerald-800">
                {t("assign.estCostFormula", { rollPart: rollPartFormula })}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <OptionalFieldsToggle
            open={showOptionalFields}
            onToggle={() => setShowOptionalFields((v) => !v)}
            showLabel={t("optional.show")}
            hideLabel={t("optional.hide")}
          />
        </div>

        {showOptionalFields && (
          <div className="mt-4">
            <OptionalFieldsCard>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-800">
                <Layers className={iconSm} strokeWidth={iconStroke} aria-hidden />
                {t("optional.title")}
              </p>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="assign_fees" className="text-sm font-medium text-slate-700">
                    {t("assign.assignmentFees")}
                  </label>
                  <span className="text-sm text-slate-500">{tCommon("actions.optional")}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{t("assign.assignmentFeesHint")}</p>
                <input
                  id="assign_fees"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  placeholder="0.00"
                  className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-400 focus:outline-none"
                />
              </div>

              {trade.option_type === "PUT" && trade.rolled_from_id && (
                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
                  <span className="font-semibold">{t("assign.rollDetected")}</span>{" "}
                  {t("assign.rollDetectedBody")}
                </div>
              )}
              {trade.option_type === "PUT" && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="assign_prior_roll" className="text-sm font-medium text-slate-700">
                      {t("assign.priorRollOverride")}
                    </label>
                    <span className="text-sm text-slate-500">{tCommon("actions.optional")}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{t("assign.priorRollHint")}</p>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                    <input
                      id="assign_prior_roll"
                      type="number"
                      step="0.01"
                      min="0"
                      value={priorRollPremium}
                      onChange={(e) => setPriorRollPremium(e.target.value)}
                      placeholder={t("assign.priorRollPlaceholder")}
                      className="w-full rounded-lg border border-purple-200 bg-white py-2 pl-7 pr-3 text-sm text-slate-900 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="assign_notes" className="text-sm font-medium text-slate-700">
                    {t("optional.notes")}
                  </label>
                  <span className="text-sm text-slate-500">{tCommon("actions.optional")}</span>
                </div>
                <textarea
                  id="assign_notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("assign.notesPlaceholder")}
                  className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-400 focus:outline-none"
                />
              </div>
            </OptionalFieldsCard>
          </div>
        )}

        <ModalActionButtons
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel={
            trade.option_type === "CALL" ? t("assign.submitCallAway") : t("assign.submitAssign")
          }
          submittingLabel={tCommon("actions.savingEllipsis")}
          cancelLabel={tCommon("actions.cancel")}
          isSubmitting={isSubmitting}
          submitTone="blue"
          submitDisabled={!Number.isFinite(priceNum) || priceNum <= 0}
        />
      </div>
    </TradeModalShell>
  );
}
