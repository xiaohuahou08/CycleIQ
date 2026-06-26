import type { Metadata } from "next";
import { createPrivatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPrivatePageMetadata("Settings");

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
