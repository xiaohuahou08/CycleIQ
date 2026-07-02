import type { Metadata } from "next";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { MARKETING_PAGE_PAD } from "@/app/components/marketing/styles";
import { createPageMetadata } from "@/lib/seo/metadata";
import ContactForm from "./ContactForm";

export const metadata: Metadata = createPageMetadata({
  title: "Contact Us",
  description:
    "Get in touch with the CycleIQ team. Questions about wheel strategy tracking, billing, or your account — we're here to help.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <MarketingShell
      activePage="contact"
      cta={{
        title: "Ready to track your wheel?",
        description: "Sign in free — Basic includes 20 trades per month.",
        buttonLabel: "Sign in / Register",
        buttonHref: "/login",
      }}
    >
      <section className="border-b border-slate-200/80 bg-white">
        <div className={MARKETING_PAGE_PAD}>
          <div className="animate-page-enter mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Get in touch
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.75rem] sm:leading-[1.1]">
              We&apos;d love to hear from you.
              <span className="text-emerald-600"> Send us a message.</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Questions about CycleIQ, your account, or the wheel strategy tracker? Fill out the
              form below and we&apos;ll reply to your email as soon as we can.
            </p>
          </div>

          <ContactForm />
        </div>
      </section>
    </MarketingShell>
  );
}
