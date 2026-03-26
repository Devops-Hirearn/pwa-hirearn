import { PublicPageFrame } from "@/components/layout/PublicPageFrame";
import type { ReactNode } from "react";

export default function AboutLayout({ children }: { children: ReactNode }) {
  return <PublicPageFrame eyebrow="About">{children}</PublicPageFrame>;
}
