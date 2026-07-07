"use client";

import { LegalDocument, LegalSection } from "@/app/components/marketing/LegalDocument";
import { useLocale, useTranslations } from "@/lib/i18n/locale-context";
import { SUPPORT_EMAIL } from "@/lib/seo/site";

function LegalBulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function TermsContent() {
  const { t } = useTranslations("legal");
  const { messages } = useLocale();
  const sections = messages.legal.terms.sections;
  const lastUpdated = t("terms.lastUpdated");

  return (
    <LegalDocument title={t("terms.title")} lastUpdated={lastUpdated}>
      <LegalSection title={t("terms.sections.agreement.title")}>
        <p>{t("terms.sections.agreement.p1")}</p>
        <p>{t("terms.sections.agreement.p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.sections.notFinancialAdvice.title")}>
        <p>{t("terms.sections.notFinancialAdvice.p1")}</p>
        <p>{t("terms.sections.notFinancialAdvice.p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.sections.eligibility.title")}>
        <p>{t("terms.sections.eligibility.p1")}</p>
        <p>{t("terms.sections.eligibility.p2", { email: SUPPORT_EMAIL })}</p>
      </LegalSection>

      <LegalSection title={t("terms.sections.plansAndBilling.title")}>
        <p>{t("terms.sections.plansAndBilling.p1")}</p>
        <p>{t("terms.sections.plansAndBilling.p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.sections.acceptableUse.title")}>
        <p>{t("terms.sections.acceptableUse.p1")}</p>
        <LegalBulletList items={sections.acceptableUse.items} />
      </LegalSection>

      <LegalSection title={t("terms.sections.yourContent.title")}>
        <p>{t("terms.sections.yourContent.p1")}</p>
        <p>{t("terms.sections.yourContent.p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.sections.serviceAvailability.title")}>
        <p>{t("terms.sections.serviceAvailability.p1")}</p>
        <p>{t("terms.sections.serviceAvailability.p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.sections.limitationOfLiability.title")}>
        <p>{t("terms.sections.limitationOfLiability.p1")}</p>
        <p>{t("terms.sections.limitationOfLiability.p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.sections.indemnification.title")}>
        <p>{t("terms.sections.indemnification.p1")}</p>
      </LegalSection>

      <LegalSection title={t("terms.sections.termination.title")}>
        <p>{t("terms.sections.termination.p1")}</p>
      </LegalSection>

      <LegalSection title={t("terms.sections.changes.title")}>
        <p>{t("terms.sections.changes.p1")}</p>
      </LegalSection>

      <LegalSection title={t("terms.sections.governingLaw.title")}>
        <p>{t("terms.sections.governingLaw.p1")}</p>
      </LegalSection>

      <LegalSection title={t("terms.sections.contact.title")}>
        <p>{t("terms.sections.contact.p1", { email: SUPPORT_EMAIL })}</p>
      </LegalSection>
    </LegalDocument>
  );
}
