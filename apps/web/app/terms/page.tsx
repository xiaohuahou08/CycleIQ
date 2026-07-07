import type { Metadata } from "next";
import { getServerTranslations } from "@/lib/i18n/server";
import { createPageMetadata } from "@/lib/seo/metadata";
import TermsContent from "./TermsContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslations("legal");
  return createPageMetadata({
    title: t("terms.metaTitle"),
    description: t("terms.metaDescription"),
    path: "/terms",
  });
}

export default function TermsOfServicePage() {
  return <TermsContent />;
}
