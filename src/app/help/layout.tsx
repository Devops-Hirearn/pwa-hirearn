import { PublicPageFrame } from "@/components/layout/PublicPageFrame";
import type { ReactNode } from "react";

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <PublicPageFrame eyebrow="Help">{children}</PublicPageFrame>;
}
