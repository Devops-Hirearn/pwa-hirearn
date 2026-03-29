"use client";

import Link from "next/link";
import { EmployerKycForm } from "@/components/employer/EmployerKycForm";

export default function SettingsKycPage() {
  return (
    <div className="min-h-[60vh] pb-8">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm transition active:scale-95"
            aria-label="Back to settings"
          >
            ←
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900">KYC &amp; Verification</h1>
            <p className="text-xs font-medium text-slate-500">Update or resubmit documents</p>
          </div>
        </div>
      </header>
      <div className="px-4 pt-6">
        <EmployerKycForm />
      </div>
    </div>
  );
}
