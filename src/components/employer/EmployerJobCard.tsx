"use client";

import Link from "next/link";
import type { JobCardModel } from "@/lib/jobs/display";

const statusBadgeClass: Record<string, string> = {
  upcoming: "border-amber-200 bg-amber-50 text-amber-800",
  ongoing: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  expired: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

function backendBadge(isFull: boolean, draft: boolean) {
  if (isFull) return { cls: "border-red-200 bg-red-50 text-red-700", label: "Not Accepting" };
  if (draft) return { cls: "border-slate-200 bg-slate-100 text-slate-600", label: "Draft" };
  return { cls: "border-emerald-200 bg-emerald-50 text-emerald-700", label: "Posted" };
}

const uiLabel: Record<string, string> = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
};

type Props = {
  model: JobCardModel;
};

export function EmployerJobCard({ model }: Props) {
  const draft = model.backendStatus === "draft";
  const bb = backendBadge(model.isFull, draft);

  return (
    <article
      className="mb-3 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: model.accentColor }}
    >
      <div className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3 className="text-base font-semibold leading-snug text-slate-900">{model.title}</h3>
          <div className="flex shrink-0 flex-wrap gap-2">
            <span
              className={
                "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium " +
                (statusBadgeClass[model.uiStatus] || statusBadgeClass.cancelled)
              }
            >
              {uiLabel[model.uiStatus] || model.uiStatus}
            </span>
            <span className={"inline-flex rounded-full border px-2 py-0.5 text-xs font-medium " + bb.cls}>
              {bb.label}
            </span>
          </div>
        </div>

        {!model.isMonthly && (model.dateLine || model.timeLine) ? (
          <div className="mt-3 flex items-start gap-2">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600">
              <CalendarIcon className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs text-slate-600">
              {model.dateLine}
              {model.timeLine ? ` · ${model.timeLine}` : ""}
            </p>
          </div>
        ) : null}

        {model.isMonthly ? (
          <div className="mt-3 flex items-start gap-2">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
              <CashIcon className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs text-slate-600">{model.wageLabel}</p>
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-600">
              <PinIcon className="h-3.5 w-3.5" />
            </span>
            <p className="truncate text-xs text-slate-600">{model.locationLine}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-slate-600">
            <PeopleIcon className="h-3.5 w-3.5 text-indigo-500" />
            <span>
              {model.workersApproved}/{model.workersNeeded}{" "}
              {model.isMonthly ? "Shortlisted" : "Approved"}
            </span>
          </div>
        </div>

        {!model.isMonthly ? (
          <div className="mt-2 flex items-start gap-2">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
              <CashIcon className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs text-slate-600">
              {model.wageLabel} · Daily Wage
            </p>
          </div>
        ) : null}

        <Link
          href={"/jobs/" + encodeURIComponent(model.id)}
          className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-medium text-[#2563EB]"
        >
          View Details
          <ChevronIcon />
        </Link>
      </div>
    </article>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function CashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 21s-8-4.5-8-11a8 8 0 0116 0c0 6.5-8 11-8 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
