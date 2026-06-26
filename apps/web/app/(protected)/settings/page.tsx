"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import { resetTradingData } from "@/lib/api/account";
import { useProtectedAuth } from "../auth-context";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getUserDisplayName } from "@/lib/auth/user-profile";
import { useTradeDefaults } from "@/lib/hooks/useTradeDefaults";

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
function TradingDefaultsSection() {
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
        hint="Maximum total capital deployed (open CSP cash + stock held after assignment). Dashboard shows utilization %; new trades cannot increase invested capital above this limit."
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">$</span>
          <input
            type="number"
            min="1"
            step="100"
            value={totalCapitalBudget}
            onChange={(e) => setTotalCapitalBudget(e.target.value)}
            className="w-28 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
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
          hint="Permanently delete every trade and wheel cycle on your account. Trading defaults in Settings are kept."
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

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <AccountSection email={email} displayName={displayName} />
        <TradingDefaultsSection />
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
