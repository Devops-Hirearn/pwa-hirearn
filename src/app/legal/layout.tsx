import { PublicPageFrame } from "@/components/layout/PublicPageFrame";
import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <PublicPageFrame eyebrow="Legal">{children}</PublicPageFrame>;
}
