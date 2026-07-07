import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLoadingShell } from "@/app/components/AuthShell";
import { getServerTranslations } from "@/lib/i18n/server";
import { createAuthPageMetadata } from "@/lib/seo/metadata";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslations("auth");
  return createAuthPageMetadata({
    title: t("login.metaTitle"),
    description: t("login.metaDescription"),
    path: "/login",
  });
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingShell />}>
      <LoginForm />
    </Suspense>
  );
}
