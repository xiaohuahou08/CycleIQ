"use client";

import AdUnit from "@/app/components/AdUnit";

const adsenseSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

type AdSlotProps = {
  pagePadClassName: string;
};

/** Homepage ad block; hidden unless NEXT_PUBLIC_ADSENSE_SLOT is set. */
export default function AdSlot({ pagePadClassName }: AdSlotProps) {
  if (!adsenseSlot) return null;

  return (
    <section className="border-b border-slate-200/80 bg-slate-50">
      <div className={`${pagePadClassName} py-6`}>
        <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
            Sponsored
          </p>
          <AdUnit slot={adsenseSlot} className="min-h-[90px] w-full" />
        </div>
      </div>
    </section>
  );
}
