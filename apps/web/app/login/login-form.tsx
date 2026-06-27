"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import AuthShell, {
  AUTH_INPUT_CLS,
  AUTH_LABEL_CLS,
  AUTH_PRIMARY_BTN_CLS,
} from "@/app/components/AuthShell";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import { getSupabaseClient } from "@/lib/supabase/client";
import { safeInternalRedirectPath } from "@/lib/auth-redirect.mjs";

function mapLoginError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid email or password")) {
    return "Invalid email or password.";
  }
  return message;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidEmail = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
  const registrationMessage =
    searchParams.get("registered") === "1"
      ? "Registration successful. Please check your email to confirm your account if required."
      : null;

  const oauthErrorMessage =
    searchParams.get("error") === "supabase_url"
      ? "Supabase URL is misconfigured. Set NEXT_PUBLIC_SUPABASE_URL to https://<project>.supabase.co only (no /auth/v1/... path) in Vercel, then redeploy."
      : searchParams.get("error") === "oauth"
      ? typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app")
        ? "Google sign-in failed (bad_oauth_callback). In your dev Supabase project → Authentication → URL Configuration, add Redirect URL https://*-xiaohuahou-4977s-projects.vercel.app/** (or https://*-.vercel.app/**). Also set NEXT_PUBLIC_SUPABASE_URL to the project origin only, redeploy, then retry."
        : "Google sign-in failed. Please try again or use email and password."
      : null;

  const nextPath = searchParams.get("next");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isValidEmail) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient(rememberMe);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(mapLoginError(signInError.message));
        return;
      }

      router.refresh();

      const target = safeInternalRedirectPath(nextPath) ?? "/dashboard";

      await new Promise((resolve) => setTimeout(resolve, 100));

      router.push(target);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unexpected error while signing in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your CycleIQ account to continue tracking your wheel."
      footer={
        <p className="text-sm text-slate-600">
          New to CycleIQ?{" "}
          <Link
            href={nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : "/register"}
            className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:decoration-slate-500"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        {registrationMessage ? (
          <p role="status" className="rounded-lg border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            {registrationMessage}
          </p>
        ) : null}

        {oauthErrorMessage ? (
          <p role="alert" className="rounded-lg border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {oauthErrorMessage}
          </p>
        ) : null}

        <GoogleSignInButton
          nextPath={nextPath}
          rememberMe={rememberMe}
          onError={setError}
        />

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-slate-200" />
          </div>
          <p className="relative mx-auto w-fit bg-white px-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Or with email
          </p>
        </div>

        <div>
          <label htmlFor="email" className={AUTH_LABEL_CLS}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={AUTH_INPUT_CLS}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className={AUTH_LABEL_CLS}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={AUTH_INPUT_CLS}
            required
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-emerald-500/30"
            />
            Remember me
          </label>
          <span className="text-sm text-slate-500">Forgot password? Coming soon</span>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={isSubmitting} className={AUTH_PRIMARY_BTN_CLS}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
