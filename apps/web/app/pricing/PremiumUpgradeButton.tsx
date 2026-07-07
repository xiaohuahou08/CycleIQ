"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BTN_PRIMARY } from "@/app/components/marketing/MarketingShell";
import { createCheckoutSession } from "@/lib/api/billing";
import { useTranslations } from "@/lib/i18n/locale-context";
import { getSupabaseClient } from "@/lib/supabase/client";

/** Post-login target that auto-starts Stripe checkout on the pricing page. */
export const PRICING_CHECKOUT_PATH = "/pricing?checkout=1";

export default function PremiumUpgradeButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations("marketing");
  const { t: tCommon } = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const autoCheckoutStarted = useRef(false);
  const canceled = !dismissed && searchParams.get("billing") === "canceled";
  const shouldAutoCheckout = searchParams.get("checkout") === "1";

  const readAuth = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) {
        return { hasSession: false, token: null as string | null };
      }
      const { data: sessionData } = await supabase.auth.getSession();
      return {
        hasSession: true,
        token: sessionData.session?.access_token ?? null,
      };
    } catch {
      return { hasSession: false, token: null as string | null };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readAuth().then(({ hasSession: signedIn }) => {
      if (!cancelled) setHasSession(signedIn);
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
  }, [readAuth]);

  const refreshSession = useCallback(async () => {
    const { hasSession: signedIn, token } = await readAuth();
    setHasSession(signedIn);
    return token;
  }, [readAuth]);

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
      setError(err instanceof Error ? err.message : t("pricing.upgrade.error"));
      setLoading(false);
    }
  }, [refreshSession, router, t]);

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
        {t("pricing.upgrade.signIn")}
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
          <span>{t("pricing.upgrade.canceled")}</span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="font-semibold underline-offset-2 hover:underline"
            aria-label={tCommon("a11y.dismiss")}
          >
            {tCommon("a11y.dismiss")}
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={loading || hasSession === null}
        className={`${BTN_PRIMARY} w-full disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading
          ? tCommon("actions.redirecting")
          : hasSession === null
            ? tCommon("actions.loading")
            : t("pricing.upgrade.button")}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-center text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
