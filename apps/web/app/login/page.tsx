import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLoadingShell } from "@/app/components/AuthShell";
import { createAuthPageMetadata } from "@/lib/seo/metadata";
import { LoginForm } from "./login-form";

export const metadata: Metadata = createAuthPageMetadata({
  title: "Sign in",
  description: "Sign in to CycleIQ to track your options wheel cycles, CSPs, covered calls, and premium P&L.",
  path: "/login",
});

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingShell />}>
      <LoginForm />
    </Suspense>
  );
}
