"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmployerJobCard } from "@/components/employer/EmployerJobCard";
import { getMyJobs } from "@/lib/api/employer";
import type { EmployerJob } from "@/lib/api/types";
import { getUiJobStatus, jobToCardModel, type UiJobStatus } from "@/lib/jobs/display";

const TABS: { key: UiJobStatus; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
];

export default function JobsPage() {
  const [tab, setTab] = useState<UiJobStatus>("upcoming");
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setJobs(await getMyJobs());
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = jobs.filter((j) => getUiJobStatus(j) === tab);
  const cards = filtered.map((j) => jobToCardModel(j));

  return (
    <div className="min-h-[60vh] bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 pb-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between pb-3">
          <h1 className="text-xl font-bold text-slate-900">Jobs</h1>
          <Link
            href="/jobs/post"
            className="rounded-full bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-sm"
          >
            Post job
          </Link>
        </div>
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition " +
                (tab === key
                  ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                  : "border-slate-200 bg-white text-slate-600")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-700">No jobs in this tab</p>
            <p className="mt-1 text-xs text-slate-500">
              Switch tabs or post a new job to get started.
            </p>
            <Link
              href="/jobs/post"
              className="mt-4 inline-flex rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Post job
            </Link>
          </div>
        ) : (
          <div>{cards.map((m) => <EmployerJobCard key={m.id} model={m} />)}</div>
        )}
      </main>
    </div>
  );
}
