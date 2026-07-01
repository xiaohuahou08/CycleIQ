"use client";

import { useEffect, useRef } from "react";

type AdUnitProps = {
  /** AdSense ad slot ID (from your AdSense dashboard). */
  slot: string;
  /** AdSense ad format. Defaults to "auto" responsive units. */
  format?: string;
  /** Whether the unit should stretch to full width on small screens. */
  fullWidthResponsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdUnit({
  slot,
  format = "auto",
  fullWidthResponsive = true,
  className,
  style,
}: AdUnitProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!adsenseClient || pushed.current) return;

    let cancelled = false;
    const tryPush = () => {
      if (cancelled || pushed.current || !insRef.current) return;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch {
        // AdSense script not ready yet.
      }
    };

    tryPush();
    const intervalId = window.setInterval(() => {
      if (pushed.current) {
        window.clearInterval(intervalId);
        return;
      }
      tryPush();
    }, 300);
    const timeoutId = window.setTimeout(() => window.clearInterval(intervalId), 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!adsenseClient) return null;

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${className ?? ""}`}
      style={{ display: "block", ...style }}
      data-ad-client={adsenseClient}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
    />
  );
}
