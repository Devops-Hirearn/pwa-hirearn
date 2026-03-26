"use client";

import Link from "next/link";

export default function BankPlaceholderPage() {
  return (
    <div className="min-h-[50vh] bg-slate-50 px-4 py-8">
      <Link href="/settings" className="text-sm font-medium text-[#2563EB]">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Bank account</h1>
      <p className="mt-2 text-sm text-slate-600">
        Add or change payout bank details in the mobile app for now; web parity is coming.
      </p>
    </div>
  );
}
