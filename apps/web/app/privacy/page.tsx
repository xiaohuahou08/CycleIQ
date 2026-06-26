import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/app/components/marketing/LegalDocument";
import { createPageMetadata } from "@/lib/seo/metadata";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, and protects your information.`,
  path: "/privacy",
});

const LAST_UPDATED = "June 3, 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection title="Introduction">
        <p>
          {SITE_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides a web application for
          tracking options wheel strategies (cash-secured puts, covered calls, assignments, and
          related lifecycle events). This Privacy Policy explains what information we collect, how we
          use it, and the choices you have.
        </p>
        <p>
          By creating an account or using {SITE_NAME}, you agree to this Privacy Policy. If you do not
          agree, please do not use the service.
        </p>
      </LegalSection>

      <LegalSection title="Information we collect">
        <p>
          <strong className="text-slate-800">Account information.</strong> When you register, we
          collect your email address and authentication credentials (or OAuth profile data if you sign
          in with Google). Authentication is handled by Supabase Auth.
        </p>
        <p>
          <strong className="text-slate-800">Trading and portfolio data.</strong> Information you
          enter into the app, including tickers, strikes, premiums, trade dates, statuses, wheel
          cycles, capital budget, deposits/withdrawals, and related settings. This data is stored to
          provide dashboards, reports, and analytics you request.
        </p>
        <p>
          <strong className="text-slate-800">Usage and technical data.</strong> We may collect
          standard log data (such as IP address, browser type, pages visited, and timestamps) through
          our hosting and infrastructure providers to operate, secure, and improve the service.
        </p>
      </LegalSection>

      <LegalSection title="How we use your information">
        <p>We use your information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide, maintain, and personalize the {SITE_NAME} service</li>
          <li>Authenticate you and keep your account secure</li>
          <li>Sync your preferences and trading data across devices</li>
          <li>Enforce plan limits (for example, monthly trade caps on the Basic plan)</li>
          <li>Respond to support requests and communicate about the service</li>
          <li>Detect abuse, fraud, and technical issues</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection title="How we share information">
        <p>We may share information only in these circumstances:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-slate-800">Service providers</strong> that help us run the
            product (for example, Supabase for authentication and database hosting, and cloud hosting
            providers). They process data on our behalf under contractual obligations.
          </li>
          <li>
            <strong className="text-slate-800">Legal requirements</strong> when we believe disclosure
            is required by law, regulation, legal process, or to protect rights, safety, and security.
          </li>
          <li>
            <strong className="text-slate-800">Business transfers</strong> in connection with a
            merger, acquisition, or sale of assets, subject to this policy.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Data retention">
        <p>
          We retain your account and trading data while your account is active. You may delete trading
          data using in-app reset tools. If you wish to delete your account entirely, contact us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-slate-800 underline-offset-2 hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p>
          We may retain limited information as required for legal, security, or backup purposes after
          deletion.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use industry-standard measures such as encrypted connections (HTTPS), authenticated API
          access, and access controls. No method of transmission or storage is 100% secure; we cannot
          guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="Your rights and choices">
        <p>Depending on where you live, you may have rights to access, correct, delete, or export your
          personal data, or to object to certain processing. To exercise these rights, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-slate-800 underline-offset-2 hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p>
          You can update trading defaults and capital settings in the app. You can sign out at any time
          from Settings.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          {SITE_NAME} is not intended for users under 18. We do not knowingly collect personal
          information from children. If you believe a child has provided us data, contact us and we will
          delete it.
        </p>
      </LegalSection>

      <LegalSection title="International users">
        <p>
          Your information may be processed in countries other than your own, including where our
          service providers operate. By using {SITE_NAME}, you consent to this transfer subject to
          applicable safeguards.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. We will post the revised version on this
          page and update the &quot;Last updated&quot; date. Material changes may be communicated by
          email or in-app notice where appropriate.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about this Privacy Policy? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-slate-800 underline-offset-2 hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
