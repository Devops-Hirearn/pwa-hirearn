"use client";

import Link from "next/link";
import type { EmployerJob } from "@/lib/api/types";

type Props = {
  open: boolean;
  variant: "home" | "job";
  jobs: EmployerJob[];
  jobTitle?: string;
  totalOutstandingLabel: string | null;
  onDismiss: () => void;
  onPayNow: () => void;
  onViewJobs?: () => void;
};

export function EmployerCompletionPaymentModal({
  open,
  variant,
  jobs,
  jobTitle,
  totalOutstandingLabel,
  onDismiss,
  onPayNow,
  onViewJobs,
}: Props) {
  if (!open) return null;

  const count = jobs.length;
  const preview = jobs.slice(0, 3);
  const title =
    variant === "job"
      ? "Payment pending"
      : count > 1
        ? "Pending payments"
        : "Payment pending";
  const body =
    variant === "job"
      ? `“${jobTitle || "This job"}” is completed but the remaining balance is still pending. Settle it below to finish payouts.`
      : count > 1
        ? `You have ${count} completed jobs waiting for final payment. Clearing these helps close jobs and release payouts.`
        : "This job is completed but the remaining balance is still pending. Please settle it to finish the job.";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onDismiss}
      onKeyDown={(e) => {
        if (e.key === "Escape") onDismiss();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 text-left shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="completion-pay-title"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <WalletIcon className="h-6 w-6" />
        </div>
        <h3 id="completion-pay-title" className="text-center text-lg font-bold text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-center text-sm font-medium leading-relaxed text-slate-600">{body}</p>
        {totalOutstandingLabel ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
            <p className="text-xs font-semibold text-slate-500">Total outstanding</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{totalOutstandingLabel}</p>
          </div>
        ) : null}
        {variant === "home" && preview.length > 0 ? (
          <ul className="mt-4 max-h-32 space-y-2 overflow-y-auto text-left text-sm text-slate-700">
            {preview.map((j) => (
              <li key={j.id} className="truncate font-medium">
                · {j.title || "Job"}
              </li>
            ))}
            {count > preview.length ? (
              <li className="text-xs font-semibold text-slate-500">
                +{count - preview.length} more pending job(s)
              </li>
            ) : null}
          </ul>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          {variant === "home" && count > 1 && onViewJobs ? (
            <Link
              href="/jobs"
              onClick={onViewJobs}
              className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-800 shadow-sm"
            >
              View pending jobs
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onPayNow}
            className="w-full rounded-xl bg-[#2563EB] py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20"
          >
            {variant === "home" && count > 1 ? "Pay oldest job" : "Review payment"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}
