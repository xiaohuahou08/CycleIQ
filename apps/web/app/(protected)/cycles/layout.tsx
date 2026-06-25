import type { Metadata } from "next";
import { createPrivatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPrivatePageMetadata("Cycles");

export default function CyclesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
