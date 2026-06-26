import type { SVGProps } from "react";

/** Shared Lucide-style sizing for UI icons (SVG). */
export const iconXs = "h-3.5 w-3.5 shrink-0";
export const iconSm = "h-4 w-4 shrink-0";
export const iconMd = "h-5 w-5 shrink-0";
export const iconLg = "h-6 w-6 shrink-0";
export const iconStroke = 1.75;

type MarkProps = SVGProps<SVGSVGElement>;

/** CycleIQ wheel mark for sidebar / branding. */
export function CycleIQMark({ className, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.12" />
      <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M20 11v2M20 27v2M11 20h2M27 20h2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M13.5 20a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="2.5" fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}
