import type { Metadata } from "next";
import { createPrivatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPrivatePageMetadata("Reports");

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
