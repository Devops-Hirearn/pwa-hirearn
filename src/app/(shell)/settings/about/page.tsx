"use client";

import Link from "next/link";

export default function AboutSettingsPage() {
  return (
    <div className="min-h-[50vh] pb-8">
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
            <h1 className="text-base font-bold text-slate-900">About</h1>
            <p className="text-xs font-medium text-slate-500">Hirearn for employers</p>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-4 pt-6">
        <div className="hirearn-card rounded-3xl p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB] shadow-lg shadow-blue-500/25">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
              <path
                d="M12 3L4 7v10l8 4 8-4V7l-8-4z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
              <path d="M12 12l8-4M12 12v10M12 12L4 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mt-4 text-xl font-bold text-slate-900">Hirearn</p>
          <p className="mt-1 text-sm font-medium text-slate-500">Employer web app</p>
        </div>

        <div className="hirearn-card rounded-3xl p-5 sm:p-6">
          <p className="text-[15px] leading-relaxed text-slate-600">
            Hirearn helps you staff daily and monthly roles with verified workers, clear attendance, and
            organized payouts — from your phone or desktop.
          </p>
        </div>

        <div className="hirearn-card rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-500">Version</span>
            <span className="font-semibold text-slate-900">1.0.0 (Web)</span>
          </div>
        </div>

        <Link
          href="/help?from=/settings/about"
          className="block hirearn-card rounded-2xl px-5 py-4 text-sm font-semibold text-[#2563EB] transition active:scale-[0.99]"
        >
          Open help centre →
        </Link>
      </div>
    </div>
  );
}
