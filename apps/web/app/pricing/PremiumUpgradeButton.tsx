"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BTN_PRIMARY } from "@/app/components/marketing/MarketingShell";
import { createCheckoutSession } from "@/lib/api/billing";
import { getSupabaseClient } from "@/lib/supabase/client";

/** Post-login target that auto-starts Stripe checkout on the pricing page. */
export const PRICING_CHECKOUT_PATH = "/pricing?checkout=1";

export default function PremiumUpgradeButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const autoCheckoutStarted = useRef(false);
  const canceled = !dismissed && searchParams.get("billing") === "canceled";
  const shouldAutoCheckout = searchParams.get("checkout") === "1";

  const refreshSession = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) {
        setHasSession(false);
        return null;
      }
      setHasSession(true);
      const { data: sessionData } = await supabase.auth.getSession();
      return sessionData.session?.access_token ?? null;
    } catch {
      setHasSession(false);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refreshSession().then(() => {
      if (cancelled) return;
    });

    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setHasSession(Boolean(session));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  const startCheckout = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = await refreshSession();
      if (!token) {
        setLoading(false);
        router.push(`/login?next=${encodeURIComponent(PRICING_CHECKOUT_PATH)}`);
        return;
      }
      const { url } = await createCheckoutSession(token);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setLoading(false);
    }
  }, [refreshSession, router]);

  useEffect(() => {
    if (!shouldAutoCheckout || hasSession !== true || autoCheckoutStarted.current) return;
    autoCheckoutStarted.current = true;
    void startCheckout();
  }, [shouldAutoCheckout, hasSession, startCheckout]);

  if (hasSession === false) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(PRICING_CHECKOUT_PATH)}`}
        className={`${BTN_PRIMARY} w-full ${className}`}
      >
        Sign in to upgrade
      </Link>
    );
  }

  return (
    <div className={className}>
      {canceled ? (
        <div
          role="status"
          className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          <span>Checkout canceled — you can upgrade anytime.</span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="font-semibold underline-offset-2 hover:underline"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={loading || hasSession === null}
        className={`${BTN_PRIMARY} w-full disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? "Redirecting…" : hasSession === null ? "Loading…" : "Upgrade to Premium — $1/mo"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-center text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
