import type { ReactNode } from "react";

export type FaqItem = {
  question: string;
  answer: ReactNode;
};

export default function MarketingFaq({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: readonly FaqItem[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-3 text-base text-slate-600">{subtitle}</p> : null}
      </div>
      <dl className="mt-10 divide-y divide-slate-200 border-t border-b border-slate-200">
        {items.map((item) => (
          <div key={item.question} className="py-6">
            <dt className="text-base font-semibold text-slate-900">{item.question}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-slate-600">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
