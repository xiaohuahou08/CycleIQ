import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/app/components/marketing/LegalDocument";
import { createPageMetadata } from "@/lib/seo/metadata";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service",
  description: `Terms and conditions for using the ${SITE_NAME} wheel strategy tracker.`,
  path: "/terms",
});

const LAST_UPDATED = "June 3, 2026";

export default function TermsOfServicePage() {
  return (
    <LegalDocument title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <LegalSection title="Agreement">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of {SITE_NAME}, a
          wheel strategy tracking application (the &quot;Service&quot;). By creating an account or using
          the Service, you agree to these Terms and our{" "}
          <a href="/privacy" className="font-medium text-slate-800 underline-offset-2 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
        <p>If you do not agree, do not use the Service.</p>
      </LegalSection>

      <LegalSection title="Not financial advice">
        <p>
          {SITE_NAME} is a record-keeping and analytics tool only. We are not a broker-dealer,
          investment adviser, or tax professional. The Service does not execute trades, hold funds, or
          provide personalized investment, legal, or tax advice.
        </p>
        <p>
          You are solely responsible for your trading decisions and for verifying that any data you
          enter is accurate. Past performance shown in the app does not guarantee future results.
        </p>
      </LegalSection>

      <LegalSection title="Eligibility and account">
        <p>
          You must be at least 18 years old and able to form a binding contract to use the Service. You
          are responsible for maintaining the confidentiality of your login credentials and for all
          activity under your account.
        </p>
        <p>
          Notify us promptly at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-slate-800 underline-offset-2 hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          if you suspect unauthorized access.
        </p>
      </LegalSection>

      <LegalSection title="Plans and billing">
        <p>
          {SITE_NAME} may offer free and paid plans (for example, Basic with usage limits and Premium
          with expanded limits). Plan features, limits, and pricing are described on our pricing page
          and may change with notice.
        </p>
        <p>
          Paid subscriptions, when available, will be subject to additional payment terms presented at
          checkout. Fees are non-refundable except where required by law or explicitly stated.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use the Service for any unlawful purpose</li>
          <li>Attempt to gain unauthorized access to systems, accounts, or data</li>
          <li>Interfere with or disrupt the Service or its infrastructure</li>
          <li>Scrape, reverse engineer, or resell the Service except as permitted by law</li>
          <li>Upload malicious code or content that infringes others&apos; rights</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You retain ownership of trade and portfolio data you submit. You grant us a limited license
          to host, process, and display that data solely to operate and improve the Service for you.
        </p>
        <p>
          You represent that you have the right to provide the data you enter and that it does not
          violate applicable law or third-party rights.
        </p>
      </LegalSection>

      <LegalSection title="Service availability">
        <p>
          We strive to keep the Service available but do not guarantee uninterrupted or error-free
          operation. We may modify, suspend, or discontinue features with reasonable notice when
          practicable.
        </p>
        <p>
          The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without
          warranties of any kind, whether express or implied, including merchantability, fitness for a
          particular purpose, and non-infringement.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, {SITE_NAME} and its operators will not be liable for
          any indirect, incidental, special, consequential, or punitive damages, or for lost profits,
          data, or trading losses, arising from your use of the Service.
        </p>
        <p>
          Our total liability for any claim relating to the Service is limited to the greater of (a)
          amounts you paid us in the twelve months before the claim or (b) one hundred U.S. dollars
          (USD $100).
        </p>
      </LegalSection>

      <LegalSection title="Indemnification">
        <p>
          You agree to indemnify and hold harmless {SITE_NAME} and its operators from claims, damages,
          and expenses (including reasonable legal fees) arising from your use of the Service, your
          content, or your violation of these Terms.
        </p>
      </LegalSection>

      <LegalSection title="Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate your access if you
          violate these Terms, pose a security risk, or if required by law. Upon termination, your
          right to use the Service ends; provisions that by nature should survive will remain in
          effect.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these Terms">
        <p>
          We may update these Terms from time to time. Continued use after the effective date of
          revised Terms constitutes acceptance. If you do not agree to the new Terms, you must stop
          using the Service.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These Terms are governed by applicable law in the jurisdiction where {SITE_NAME} is operated,
          without regard to conflict-of-law principles. Disputes will be resolved in the courts of that
          jurisdiction, unless otherwise required by mandatory consumer protection laws in your country
          of residence.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these Terms? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-slate-800 underline-offset-2 hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
