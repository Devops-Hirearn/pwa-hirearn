"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const safeReturn = (v: string | null) => {
  if (!v || !v.startsWith("/") || v.startsWith("//")) return "/login";
  return v;
};

export function PublicBackLink() {
  const sp = useSearchParams();
  const href = safeReturn(sp.get("from"));

  return (
    <Link
      href={href}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm transition active:scale-95"
      aria-label="Back"
    >
      ←
    </Link>
  );
}
