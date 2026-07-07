import type { Metadata } from "next";
import { getServerTranslations } from "@/lib/i18n/server";
import { createPageMetadata } from "@/lib/seo/metadata";
import PrivacyContent from "./PrivacyContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslations("legal");
  return createPageMetadata({
    title: t("privacy.metaTitle"),
    description: t("privacy.metaDescription"),
    path: "/privacy",
  });
}

export default function PrivacyPolicyPage() {
  return <PrivacyContent />;
}
