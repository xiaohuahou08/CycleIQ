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

export default function PrivacyContent() {
  const { t } = useTranslations("legal");
  const { messages } = useLocale();
  const sections = messages.legal.privacy.sections;
  const lastUpdated = t("privacy.lastUpdated");

  return (
    <LegalDocument title={t("privacy.title")} lastUpdated={lastUpdated}>
      <LegalSection title={t("privacy.sections.introduction.title")}>
        <p>{t("privacy.sections.introduction.p1")}</p>
        <p>{t("privacy.sections.introduction.p2")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.sections.informationWeCollect.title")}>
        <p>{t("privacy.sections.informationWeCollect.p1")}</p>
        <p>{t("privacy.sections.informationWeCollect.p2")}</p>
        <p>{t("privacy.sections.informationWeCollect.p3")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.sections.howWeUse.title")}>
        <p>{t("privacy.sections.howWeUse.p1")}</p>
        <LegalBulletList items={sections.howWeUse.items} />
        <p>{t("privacy.sections.howWeUse.p2")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.sections.howWeShare.title")}>
        <p>{t("privacy.sections.howWeShare.p1")}</p>
        <LegalBulletList items={sections.howWeShare.items} />
      </LegalSection>

      <LegalSection title={t("privacy.sections.dataRetention.title")}>
        <p>{t("privacy.sections.dataRetention.p1", { email: SUPPORT_EMAIL })}</p>
        <p>{t("privacy.sections.dataRetention.p2")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.sections.security.title")}>
        <p>{t("privacy.sections.security.p1")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.sections.yourRights.title")}>
        <p>{t("privacy.sections.yourRights.p1", { email: SUPPORT_EMAIL })}</p>
        <p>{t("privacy.sections.yourRights.p2")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.sections.children.title")}>
        <p>{t("privacy.sections.children.p1")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.sections.international.title")}>
        <p>{t("privacy.sections.international.p1")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.sections.changes.title")}>
        <p>{t("privacy.sections.changes.p1")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.sections.contact.title")}>
        <p>{t("privacy.sections.contact.p1", { email: SUPPORT_EMAIL })}</p>
      </LegalSection>
    </LegalDocument>
  );
}
