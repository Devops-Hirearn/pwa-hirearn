"use client";

import Link from "next/link";

export default function KycPlaceholderPage() {
  return (
    <div className="min-h-[50vh] bg-slate-50 px-4 py-8">
      <Link href="/settings" className="text-sm font-medium text-[#2563EB]">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-bold text-slate-900">KYC & Verification</h1>
      <p className="mt-2 text-sm text-slate-600">
        Complete identity verification in the Hirearn app (Aadhaar & selfie). Web KYC is planned.
      </p>
    </div>
  );
}
