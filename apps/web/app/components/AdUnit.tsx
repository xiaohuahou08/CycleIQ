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
  const pushed = useRef(false);

  useEffect(() => {
    if (!adsenseClient || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense script not ready yet; it will retry on next mount.
    }
  }, []);

  if (!adsenseClient) return null;

  return (
    <ins
      className={`adsbygoogle ${className ?? ""}`}
      style={{ display: "block", ...style }}
      data-ad-client={adsenseClient}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
    />
  );
}
