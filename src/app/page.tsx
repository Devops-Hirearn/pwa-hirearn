'use client';

import { getStoredToken } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    if (getStoredToken()) router.replace("/home");
    else router.replace("/login");
  }, [router]);
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 hirearn-mesh text-slate-600">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
      <p className="text-sm font-medium text-slate-500">Opening Hirearn…</p>
    </div>
  );
}

