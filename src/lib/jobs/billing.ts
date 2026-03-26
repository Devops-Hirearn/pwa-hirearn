import type { EmployerJob } from "@/lib/api/types";

/**
 * Job detail / employer UI: hide token-upfront concept for all daily DIGITAL jobs
 * (settlement is via Hirearn on completion — not a separate “token” line item).
 */
export function skipsUpfrontTokenPayment(raw: Record<string, unknown> | EmployerJob | null | undefined): boolean {
  if (!raw) return false;
  const r = raw as Record<string, unknown>;
  if (r.skipsInitialPostingPayment === true) return true;
  const jobType = String(r.jobType ?? "DAILY").toUpperCase();
  if (jobType === "MONTHLY") return false;
  return String(r.payoutMode ?? "").toUpperCase() === "DIGITAL";
}

/** Completed jobs where final settlement is still due (same idea as native employer dashboard). */
export function jobNeedsCompletionBalanceReminder(job: EmployerJob | Record<string, unknown>): boolean {
  const paymentStatus = String((job as Record<string, unknown>).paymentStatus ?? "").toLowerCase();
  const status = String((job as Record<string, unknown>).status ?? "").toLowerCase();
  return status === "completed" && (paymentStatus === "pending" || paymentStatus === "partially_paid");
}

export function sortJobsByEndDateOldestFirst(jobs: EmployerJob[]): EmployerJob[] {
  return [...jobs].sort((a, b) => {
    const ar = a as Record<string, unknown>;
    const br = b as Record<string, unknown>;
    const aDate = new Date(String(ar.endDate ?? ar.date ?? ar.updatedAt ?? 0)).getTime();
    const bDate = new Date(String(br.endDate ?? br.date ?? br.updatedAt ?? 0)).getTime();
    return aDate - bDate;
  });
}

export function formatEmployerInr(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return "₹" + amount.toLocaleString("en-IN");
}

export function totalOutstandingCompletionAmount(jobs: EmployerJob[]): number {
  return jobs.reduce((sum, job) => {
    const j = job as Record<string, unknown>;
    const raw =
      j.remainingAmount ?? j.pendingPaymentAmount ?? j.totalRemainingAmount ?? (j.payInfo as Record<string, unknown>)?.totalRemainingAmount;
    const n = Number(raw);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}
