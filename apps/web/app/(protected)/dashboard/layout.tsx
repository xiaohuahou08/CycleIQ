import type { Metadata } from "next";
import { createPrivatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPrivatePageMetadata("Dashboard");

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
