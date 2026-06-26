import { CycleIQMark } from "@/app/components/icons";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <CycleIQMark className="h-8 w-8 text-emerald-400" />
          <div>
            <p className="text-sm font-bold text-white">CycleIQ</p>
            <p className="text-xs text-slate-500">Wheel strategy tracking for retail traders</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
