"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmployerCompletionPaymentModal } from "@/components/employer/EmployerCompletionPaymentModal";
import { EmployerJobCard } from "@/components/employer/EmployerJobCard";
import { getMyJobs, getUnreadNotificationCount } from "@/lib/api/employer";
import type { EmployerJob } from "@/lib/api/types";
import {
  formatEmployerInr,
  jobNeedsCompletionBalanceReminder,
  sortJobsByEndDateOldestFirst,
  totalOutstandingCompletionAmount,
} from "@/lib/jobs/billing";
import { filterActiveJobs, jobToCardModel } from "@/lib/jobs/display";
import { useAuth } from "@/contexts/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const displayName =
    (user?.fullName as string) || (user?.name as string) || "Employer";

  const [jobTypeFilter, setJobTypeFilter] = useState<"DAILY" | "MONTHLY">("DAILY");
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadN, setUnreadN] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [showCompletionPayModal, setShowCompletionPayModal] = useState(false);
  const completionReminderGateRef = useRef(true);

  const pendingCompletionJobs = useMemo(() => {
    return sortJobsByEndDateOldestFirst(jobs.filter(jobNeedsCompletionBalanceReminder));
  }, [jobs]);

  const completionOutstandingLabel = formatEmployerInr(totalOutstandingCompletionAmount(pendingCompletionJobs));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [list, unread] = await Promise.all([getMyJobs(), getUnreadNotificationCount()]);
      setJobs(list);
      setUnreadN(unread);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (loading) return;
    if (pendingCompletionJobs.length > 0 && completionReminderGateRef.current) {
      setShowCompletionPayModal(true);
      completionReminderGateRef.current = false;
    }
    if (pendingCompletionJobs.length === 0) {
      setShowCompletionPayModal(false);
    }
  }, [loading, pendingCompletionJobs]);

  const activeJobs = filterActiveJobs(jobs, jobTypeFilter);
  const cards = activeJobs.map((j) => jobToCardModel(j));

  return (
    <div className="min-h-[60vh] bg-[var(--hirearn-surface)]">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200/80 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl backdrop-saturate-150">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-sm ring-1 ring-black/[0.04]">
            <Image src="/icon-192.png" alt="" width={44} height={44} className="object-cover" priority />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-slate-900">
              Welcome, {displayName}
            </p>
            <p className="text-xs font-medium text-slate-500">Post jobs, track attendance, pay with confidence.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Quick guide"
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600"
            onClick={() => setShowGuide(true)}
          >
            <InfoIcon />
          </button>
          <Link
            href="/settings/notifications"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600"
          >
            <BellIcon />
            {unreadN > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold text-white">
                {unreadN > 99 ? "99+" : unreadN}
              </span>
            ) : null}
          </Link>
        </div>
      </header>

      <main className="px-4 pb-6 pt-4">
        <Link
          href="/jobs/post"
          className="mb-6 flex items-center gap-3 rounded-2xl bg-[#2563EB] p-4 text-white shadow-md shadow-blue-500/20"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <PlusIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-semibold">Post Job</p>
            <p className="text-xs text-blue-100">Create a new job posting</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 opacity-90" />
        </Link>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Your Active Jobs</h2>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setJobTypeFilter("DAILY")}
            className={
              "rounded-full border px-4 py-2 text-xs font-medium transition " +
              (jobTypeFilter === "DAILY"
                ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                : "border-slate-200 bg-white text-slate-600")
            }
          >
            Daily Wage
          </button>
          <button
            type="button"
            onClick={() => setJobTypeFilter("MONTHLY")}
            className={
              "rounded-full border px-4 py-2 text-xs font-medium transition " +
              (jobTypeFilter === "MONTHLY"
                ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                : "border-slate-200 bg-white text-slate-600")
            }
          >
            Monthly
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          </div>
        ) : cards.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No active jobs yet. Post your first job!
          </p>
        ) : (
          <div>{cards.map((m) => <EmployerJobCard key={m.id} model={m} />)}</div>
        )}
      </main>

      <EmployerCompletionPaymentModal
        open={showCompletionPayModal}
        variant="home"
        jobs={pendingCompletionJobs}
        totalOutstandingLabel={completionOutstandingLabel}
        onDismiss={() => setShowCompletionPayModal(false)}
        onViewJobs={() => setShowCompletionPayModal(false)}
        onPayNow={() => {
          const next = pendingCompletionJobs[0];
          setShowCompletionPayModal(false);
          if (next?.id) router.push("/jobs/" + encodeURIComponent(next.id));
        }}
      />

      {showGuide ? (
        <button
          type="button"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          aria-label="Close guide"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 text-left shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="text-lg font-bold text-slate-900">How Hirearn works</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Post a job with location and wages.</li>
              <li>Review applicants and approve workers.</li>
              <li>Track attendance and complete payments from your wallet.</li>
            </ul>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white"
              onClick={() => setShowGuide(false)}
            >
              Got it
            </button>
          </div>
        </button>
      ) : null}
    </div>
  );
}

function InfoIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
