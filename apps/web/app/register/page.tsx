import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLoadingShell } from "@/app/components/AuthShell";
import { getServerTranslations } from "@/lib/i18n/server";
import { createAuthPageMetadata } from "@/lib/seo/metadata";
import { RegisterForm } from "./register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslations("auth");
  return createAuthPageMetadata({
    title: t("register.metaTitle"),
    description: t("register.metaDescription"),
    path: "/register",
  });
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthLoadingShell />}>
      <RegisterForm />
    </Suspense>
  );
}
