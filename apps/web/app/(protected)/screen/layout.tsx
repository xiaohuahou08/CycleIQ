import type { Metadata } from "next";
import { createPrivatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPrivatePageMetadata("Screen");

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
