import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLoadingShell } from "@/app/components/AuthShell";
import { createAuthPageMetadata } from "@/lib/seo/metadata";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = createAuthPageMetadata({
  title: "Create account",
  description:
    "Create a free CycleIQ account to log wheel strategy trades, track CSP and covered call cycles, and monitor premium income.",
  path: "/register",
});

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthLoadingShell />}>
      <RegisterForm />
    </Suspense>
  );
}
