import type { Metadata } from "next";
import { createPrivatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPrivatePageMetadata("Trades");

export default function TradesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
