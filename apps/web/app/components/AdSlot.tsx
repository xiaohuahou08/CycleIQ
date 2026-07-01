"use client";

import AdUnit from "@/app/components/AdUnit";

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/** Card-sized ad unit; hidden unless AdSense client and slot env vars are set. */
export default function AdSlot() {
  const adsenseSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;
  if (!adsenseClient || !adsenseSlot) return null;

  return (
    <div className="card-hover-lift flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sponsored</p>
      <div className="mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-slate-50/80 ring-1 ring-slate-100">
        <AdUnit
          slot={adsenseSlot}
          format="rectangle"
          fullWidthResponsive
          className="block w-full"
          style={{ minHeight: 200, maxHeight: 250 }}
        />
      </div>
    </div>
  );
}
