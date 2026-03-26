"use client";

import Link from "next/link";
import { PostJobForm } from "@/components/employer/PostJobForm";

export default function PostJobPage() {
  return (
    <div className="min-h-svh w-full bg-[var(--hirearn-surface)] pb-8">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-4 py-3 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href="/home"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition active:scale-95"
            aria-label="Back to home"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight text-slate-900">Post a job</h1>
            <p className="text-[11px] font-medium text-slate-500">Publish in minutes · same quality as the app</p>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <PostJobForm />
      </div>
    </div>
  );
}
