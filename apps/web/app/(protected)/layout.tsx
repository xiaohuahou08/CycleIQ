import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo/metadata";
import ProtectedLayoutClient from "./ProtectedLayoutClient";

export const metadata: Metadata = {
  robots: NOINDEX_ROBOTS,
};

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ProtectedLayoutClient>{children}</ProtectedLayoutClient>;
}
