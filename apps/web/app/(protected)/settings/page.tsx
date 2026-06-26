"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2 } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import {
  createCheckoutSession,
  createPortalSession,
  fetchBillingStatus,
  type BillingStatus,
} from "@/lib/api/billing";
import {
  createCapitalFlow,
  deleteCapitalFlow,
  formatFlowAmount,
  getCapitalFlows,
  updateCapitalFlow,
  type CapitalFlow,
} from "@/lib/api/capitalFlows";
import { resetTradingData } from "@/lib/api/account";
import { useProtectedAuth } from "../auth-context";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getUserDisplayName } from "@/lib/auth/user-profile";
import { useTradeDefaults, TRADE_DEFAULTS_UPDATED_EVENT } from "@/lib/hooks/useTradeDefaults";

// ─── Section shell ────────────────────────────────────────────────────────────
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────
function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8 py-3 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-gray-100">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
        type === "success"
          ? "bg-emerald-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {type === "success" ? (
        <Check className={iconSm} strokeWidth={iconStroke} aria-hidden />
      ) : (
        <X className={iconSm} strokeWidth={iconStroke} aria-hidden />
      )}
      {message}
    </div>
  );
}

// ─── Billing section ──────────────────────────────────────────────────────────
function BillingSection() {
  const { token } = useProtectedAuth();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setStatus(await fetchBillingStatus(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  useEffect(() => {
    if (searchParams.get("billing") === "success") {
      setToast("Premium activated — thank you!");
      void load();
    }
  }, [searchParams]);

  const onUpgrade = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await createCheckoutSession(token);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setBusy(false);
    }
  };

  const onManage = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await createPortalSession(token);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal.");
      setBusy(false);
    }
  };

  const isPremium = status?.plan === "premium";

  return (
    <>
      {toast ? (
        <Toast message={toast} type="success" />
      ) : null}
      <Section
        title="Billing"
        description="Manage your CycleIQ plan. Premium is $1/month via Stripe."
      >
        {loading ? (
          <p className="text-sm text-gray-500">Loading plan…</p>
        ) : (
          <>
            <FieldRow label="Current plan">
              <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800">
                {status?.plan_label ?? "Basic"}
                {status?.price_usd != null ? ` · $${status.price_usd}/mo` : ""}
              </span>
            </FieldRow>
            {status?.subscription_status ? (
              <FieldRow label="Subscription" hint="Synced from Stripe webhooks.">
                <span className="text-sm text-gray-700 capitalize">
                  {status.subscription_status.replace(/_/g, " ")}
                  {status.current_period_end
                    ? ` · renews ${new Date(status.current_period_end).toLocaleDateString()}`
                    : ""}
                </span>
              </FieldRow>
            ) : null}
            {status?.trades_limit != null ? (
              <FieldRow
                label="Trade usage"
                hint={`${status.trades_this_month} of ${status.trades_limit} new trades this month (UTC).`}
              >
                <span className="text-sm text-gray-700">
                  {status.trades_remaining ?? 0} remaining
                </span>
              </FieldRow>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {isPremium && status?.can_manage_billing ? (
                <button
                  type="button"
                  onClick={() => void onManage()}
                  disabled={busy}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {busy ? "Opening…" : "Manage subscription"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void onUpgrade()}
                  disabled={busy}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy ? "Redirecting…" : "Upgrade to Premium — $1/mo"}
                </button>
              )}
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </>
        )}
      </Section>
    </>
  );
}

// ─── Account section ──────────────────────────────────────────────────────────
function AccountSection({
  email: emailProp,
  displayName: displayNameProp,
}: {
  email: string | null;
  displayName: string | null;
}) {
  const [email, setEmail] = useState(emailProp);
  const [displayName, setDisplayName] = useState(displayNameProp);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(emailProp);
     
    setDisplayName(displayNameProp);
  }, [emailProp, displayNameProp]);

  useEffect(() => {
    void getSupabaseClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!data.user) return;
        setEmail(data.user.email ?? null);
        setDisplayName(getUserDisplayName(data.user));
      });
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePasswordReset = async () => {
    if (!email) return;
    setSending(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (error) throw error;
      showToast("Password reset email sent. Check your inbox.", "success");
    } catch {
      showToast("Failed to send reset email. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <Section
        title="Account"
        description="Your account information and authentication settings."
      >
        <FieldRow label="Display name" hint="Name from your sign-in provider.">
          <span className="inline-flex max-w-[14rem] items-center truncate rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
            {displayName ?? "—"}
          </span>
        </FieldRow>
        <FieldRow label="Email address" hint="Your Supabase Auth email.">
          <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
            {email ?? "—"}
          </span>
        </FieldRow>
        <FieldRow
          label="Password"
          hint="Send a reset link to your email to change your password."
        >
          <button
            type="button"
            onClick={() => void handlePasswordReset()}
            disabled={sending || !email}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send reset email"}
          </button>
        </FieldRow>
      </Section>
    </>
  );
}

// ─── Trading defaults section ─────────────────────────────────────────────────
function TradingDefaultsSection({ hasCapitalFlows }: { hasCapitalFlows: boolean }) {
  const { defaults, setDefaults, loading, saving } = useTradeDefaults();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [commissionPerContract, setCommissionPerContract] = useState(
    defaults.commissionPerContract !== undefined
      ? String(defaults.commissionPerContract)
      : ""
  );
  const [defaultContracts, setDefaultContracts] = useState(
    String(defaults.defaultContracts ?? 1)
  );
  const [defaultDte, setDefaultDte] = useState(
    String(defaults.defaultDte ?? 45)
  );
  const [totalCapitalBudget, setTotalCapitalBudget] = useState(
    String(defaults.totalCapitalBudget ?? 10000)
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommissionPerContract(
      defaults.commissionPerContract !== undefined
        ? String(defaults.commissionPerContract)
        : ""
    );
     
    setDefaultContracts(String(defaults.defaultContracts ?? 1));
     
    setDefaultDte(String(defaults.defaultDte ?? 45));
     
    setTotalCapitalBudget(String(defaults.totalCapitalBudget ?? 10000));
  }, [defaults]);

  const handleSave = async () => {
    setSaveError(null);
    try {
      await setDefaults({
        commissionPerContract:
          commissionPerContract.trim() !== ""
            ? Number(commissionPerContract)
            : undefined,
        defaultContracts:
          defaultContracts.trim() !== "" ? Number(defaultContracts) : 1,
        defaultDte: defaultDte.trim() !== "" ? Number(defaultDte) : 45,
        totalCapitalBudget:
          totalCapitalBudget.trim() !== "" ? Number(totalCapitalBudget) : 10000,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save. Please try again.";
      setSaveError(message);
    }
  };

  return (
    <Section
      title="Trading Defaults"
      description="Pre-fill values when adding new trades. Saved to your account."
    >
      <FieldRow
        label="Commission per contract"
        hint="Auto-fills total opening commission when adding a trade (per-contract rate × contracts). Leave blank to skip."
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={commissionPerContract}
            onChange={(e) => setCommissionPerContract(e.target.value)}
            placeholder="0.65"
            className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-xs text-gray-400">/ contract</span>
        </div>
      </FieldRow>

      <FieldRow
        label="Default contracts"
        hint="Number of contracts pre-filled when opening a new trade."
      >
        <input
          type="number"
          min="1"
          step="1"
          value={defaultContracts}
          onChange={(e) => setDefaultContracts(e.target.value)}
          className="w-20 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
      </FieldRow>

      <FieldRow
        label="Total capital budget"
        hint={
          hasCapitalFlows
            ? "Locked after deposits or withdrawals exist. Change capital in Capital Management below."
            : "Initial capital only. After your first deposit or withdrawal, use Capital Management below."
        }
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">$</span>
          {hasCapitalFlows ? (
            <span className="inline-flex w-28 items-center rounded-lg bg-gray-100 px-2.5 py-1.5 text-sm font-medium text-gray-800">
              {Number(totalCapitalBudget).toLocaleString()}
            </span>
          ) : (
            <input
              type="number"
              min="1"
              step="100"
              value={totalCapitalBudget}
              onChange={(e) => setTotalCapitalBudget(e.target.value)}
              className="w-28 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          )}
        </div>
      </FieldRow>

      <FieldRow
        label="Default DTE (days to expiry)"
        hint="The expiry date pre-filled when opening a new trade."
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            step="1"
            value={defaultDte}
            onChange={(e) => setDefaultDte(e.target.value)}
            className="w-20 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-xs text-gray-400">days</span>
        </div>
      </FieldRow>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save defaults"}
        </button>
        {loading && <span className="text-sm text-slate-500">Loading…</span>}
        {saved && !saveError && (
          <span className="text-sm text-emerald-600">Saved.</span>
        )}
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>
    </Section>
  );
}

function localTodayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Capital management ───────────────────────────────────────────────────────
function CapitalFlowModal({
  type,
  open,
  onClose,
  onSubmit,
  submitting,
  initial,
}: {
  type: "deposit" | "withdrawal";
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number, eventDate: string) => Promise<void>;
  submitting: boolean;
  initial?: CapitalFlow;
}) {
  const [amount, setAmount] = useState("");
  const [eventDate, setEventDate] = useState(localTodayIsoDate());
  const [error, setError] = useState<string | null>(null);
  const isEdit = initial != null;

  useEffect(() => {
    if (open) {
      if (initial) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAmount(String(Math.abs(initial.amount)));
         
        setEventDate(initial.event_date);
      } else {
         
        setAmount("");
         
        setEventDate(localTodayIsoDate());
      }
       
      setError(null);
    }
  }, [open, type, initial]);

  if (!open) return null;

  const title = isEdit
    ? "Edit capital flow"
    : type === "deposit"
      ? "Record deposit"
      : "Record withdrawal";
  const label = type === "deposit" ? "Deposit amount" : "Withdrawal amount";

  const handleSubmit = async () => {
    setError(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!eventDate) {
      setError("Select a date.");
      return;
    }
    try {
      await onSubmit(parsed, eventDate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-scale-in w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">
          Updates your capital budget and feeds time-weighted return calculations.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">{label}</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                min="1"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={eventDate}
              max={localTodayIsoDate()}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              type === "deposit"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CapitalManagementSection({
  onFlowsChange,
}: {
  onFlowsChange: (hasFlows: boolean) => void;
}) {
  const { token } = useProtectedAuth();
  const { defaults, loading: defaultsLoading } = useTradeDefaults();
  const [flows, setFlows] = useState<CapitalFlow[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<"deposit" | "withdrawal" | null>(null);
  const [editingFlow, setEditingFlow] = useState<CapitalFlow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshFlows = async () => {
    if (!token) {
      setFlows([]);
      onFlowsChange(false);
      setLoadingFlows(false);
      return;
    }
    setLoadingFlows(true);
    try {
      const data = await getCapitalFlows(token);
      setFlows(data);
      onFlowsChange(data.length > 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load capital flows.");
    } finally {
      setLoadingFlows(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshFlows();
  }, [token]);

  const handleSubmitFlow = async (amount: number, eventDate: string) => {
    if (!token || (!modal && !editingFlow)) return;
    setSubmitting(true);
    try {
      const flowType = editingFlow?.type ?? modal!;
      if (editingFlow) {
        await updateCapitalFlow(token, editingFlow.id, {
          type: flowType,
          amount,
          event_date: eventDate,
        });
      } else {
        await createCapitalFlow(token, { type: modal!, amount, event_date: eventDate });
      }
      window.dispatchEvent(new Event(TRADE_DEFAULTS_UPDATED_EVENT));
      await refreshFlows();
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (flow: CapitalFlow) => {
    setEditingFlow(flow);
    setModal(flow.type);
  };

  const closeModal = () => {
    setModal(null);
    setEditingFlow(null);
  };

  const handleDelete = async (flow: CapitalFlow) => {
    if (!token) return;
    const label = flow.type === "deposit" ? "deposit" : "withdrawal";
    if (!window.confirm(`Remove this ${label} from ${formatDisplayDate(flow.event_date)}?`)) {
      return;
    }
    setDeletingId(flow.id);
    try {
      await deleteCapitalFlow(token, flow.id);
      window.dispatchEvent(new Event(TRADE_DEFAULTS_UPDATED_EVENT));
      await refreshFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <CapitalFlowModal
        type={modal ?? "deposit"}
        open={modal !== null}
        onClose={closeModal}
        onSubmit={handleSubmitFlow}
        submitting={submitting}
        initial={editingFlow ?? undefined}
      />
      <Section
        title="Capital Management"
        description="Record deposits and withdrawals with dates. Total capital and time-weighted return use these cash flows."
      >
        <FieldRow
          label="Current capital budget"
          hint="Budget after all recorded flows. Total capital on Dashboard = budget + realized P&L."
        >
          <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800">
            {defaultsLoading ? "…" : formatFlowAmount(defaults.totalCapitalBudget)}
          </span>
        </FieldRow>

        <div className="flex flex-wrap gap-3 py-3">
          <button
            type="button"
            onClick={() => setModal("deposit")}
            disabled={!token}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDownCircle className={iconSm} strokeWidth={iconStroke} aria-hidden />
            Deposit
          </button>
          <button
            type="button"
            onClick={() => setModal("withdrawal")}
            disabled={!token}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUpCircle className={iconSm} strokeWidth={iconStroke} aria-hidden />
            Withdraw
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loadingFlows ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : flows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    No deposits or withdrawals yet.
                  </td>
                </tr>
              ) : (
                flows.map((flow) => (
                  <tr key={flow.id}>
                    <td className="px-4 py-2.5 text-gray-900">
                      {formatDisplayDate(flow.event_date)}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-gray-700">{flow.type}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-medium ${
                        flow.type === "deposit" ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {flow.type === "deposit" ? "+" : "−"}
                      {formatFlowAmount(flow.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(flow)}
                          className="inline-flex items-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Edit entry"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={iconStroke} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(flow)}
                          disabled={deletingId === flow.id}
                          className="inline-flex items-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={iconStroke} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

// ─── Danger zone ──────────────────────────────────────────────────────────────
function DangerZoneSection() {
  const router = useRouter();
  const { token } = useProtectedAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleReset = async () => {
    if (!token) return;
    setResetting(true);
    setError(null);
    try {
      const result = await resetTradingData(token);
      setConfirmOpen(false);
      setToast(
        `Deleted ${result.trades_deleted} trade(s) and ${result.cycles_deleted} cycle(s).`
      );
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <Check className={iconSm} strokeWidth={iconStroke} aria-hidden />
          {toast}
        </div>
      )}
      <Section
        title="Danger zone"
        description="Irreversible actions for your trading data."
      >
        <FieldRow
          label="Reset all trading data"
          hint="Permanently delete every trade and wheel cycle. Capital deposits/withdrawals and trading defaults are kept."
        >
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConfirmOpen(true);
            }}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
          >
            Reset data
          </button>
        </FieldRow>
      </Section>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-data-title"
        >
          <div className="animate-scale-in w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="reset-data-title" className="text-base font-semibold text-gray-900">
              Reset all trading data?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              This will permanently delete all your trades and wheel cycles. Your account,
              login, and trading defaults will not be affected.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={resetting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={resetting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {resetting ? "Deleting…" : "Delete all data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { email, displayName, onLogout } = useProtectedAuth();
  const [hasCapitalFlows, setHasCapitalFlows] = useState(false);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Suspense fallback={null}>
          <BillingSection />
        </Suspense>
        <AccountSection email={email} displayName={displayName} />
        <TradingDefaultsSection hasCapitalFlows={hasCapitalFlows} />
        <CapitalManagementSection onFlowsChange={setHasCapitalFlows} />
        <DangerZoneSection />

        <div className="flex flex-col items-center gap-4 pt-2 pb-4">
          <button
            type="button"
            onClick={() => void onLogout()}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700"
          >
            Sign out
          </button>
          <p className="text-xs text-gray-400">CycleIQ · v0.1</p>
        </div>
      </div>
    </main>
  );
}
