"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EmployerCompletionPaymentModal } from "@/components/employer/EmployerCompletionPaymentModal";
import { JobBroadcastsModal } from "@/components/employer/JobBroadcastsModal";
import { JobEmployerActionsPanel } from "@/components/employer/JobEmployerActionsPanel";
import { getJob } from "@/lib/api/employer";
import {
  formatEmployerInr,
  jobNeedsCompletionBalanceReminder,
  skipsUpfrontTokenPayment,
  totalOutstandingCompletionAmount,
} from "@/lib/jobs/billing";
import { deleteEmployerJob, employerConfirmCashPaymentRequest, stopAcceptingRequestsJob } from "@/lib/api/jobActions";
import type { EmployerJob } from "@/lib/api/types";
import { formatDateRange, formatLocation, formatTimeRange, getUiJobStatus } from "@/lib/jobs/display";

const FACILITY_LABEL: Record<string, string> = {
  food: "Food",
  water: "Water",
  accommodation: "Accommodation",
  transport: "Transport",
  tools: "Tools",
  washroom: "Washroom",
  other: "Other",
};

type AppWorker = {
  fullName?: string;
  phoneNumber?: string;
  _id?: string;
  profilePhoto?: string;
  avatarUrl?: string;
};

type RawApplication = {
  status?: string;
  worker?: AppWorker | string;
  appliedAt?: string;
};

type JobDayRow = Record<string, unknown>;

function safeStr(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function formatDayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function applicationWorker(app: RawApplication): AppWorker | null {
  const w = app.worker;
  if (!w || typeof w === "string") return null;
  return w;
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved") return "border-emerald-200/90 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-900/5";
  if (s === "shortlisted") return "border-violet-200/90 bg-violet-50 text-violet-900 shadow-sm shadow-violet-900/5";
  if (s === "rejected" || s === "cancelled" || s === "withdrawn") {
    return "border-slate-200/90 bg-slate-100 text-slate-800 shadow-sm";
  }
  return "border-amber-200/90 bg-amber-50 text-amber-950 shadow-sm shadow-amber-900/5";
}

function isImageSrc(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:");
}

function QrImage({ src, label }: { src: string; label: string }) {
  if (!src || !isImageSrc(src)) return null;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--hirearn-shadow-sm)] ring-1 ring-black/[0.03]">
      <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="mx-auto max-h-40 w-auto max-w-full rounded-lg object-contain" />
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="hirearn-card rounded-3xl p-5 sm:p-6">
      {eyebrow ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>
      ) : null}
      <div className={eyebrow ? "mt-1" : ""}>
        <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function MetaChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "emerald" | "amber" | "slate";
}) {
  const tones: Record<string, string> = {
    neutral: "border-slate-200/90 bg-white text-slate-700 shadow-sm",
    blue: "border-blue-200/90 bg-blue-50/90 text-blue-900 shadow-sm shadow-blue-900/5",
    emerald: "border-emerald-200/90 bg-emerald-50/90 text-emerald-900 shadow-sm",
    amber: "border-amber-200/90 bg-amber-50/90 text-amber-950 shadow-sm",
    slate: "border-slate-200/90 bg-slate-100 text-slate-800 shadow-sm",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold capitalize " +
        (tones[tone] || tones.neutral)
      }
    >
      {children}
    </span>
  );
}

function ActionTile({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "primary";
}) {
  const base =
    "flex min-h-[44px] items-center justify-center rounded-2xl border px-3 py-2.5 text-center text-xs font-semibold transition active:scale-[0.98] ";
  const styles =
    variant === "primary"
      ? "border-[#2563EB]/35 bg-gradient-to-b from-blue-50 to-white text-[#2563EB] shadow-md shadow-blue-500/10 hover:border-[#2563EB]/50"
      : "border-slate-200/90 bg-white text-slate-800 shadow-[var(--hirearn-shadow-sm)] hover:border-slate-300 hover:bg-slate-50/80";
  return (
    <Link href={href} className={base + styles}>
      {children}
    </Link>
  );
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [job, setJob] = useState<EmployerJob | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [cashDayBusy, setCashDayBusy] = useState<string | null>(null);
  const [showCompletionPayModal, setShowCompletionPayModal] = useState(false);
  const completionDetailGateRef = useRef(true);

  useEffect(() => {
    if (!id) return;
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const j = await getJob(id);
        if (!cancel) setJob(j);
      } catch (e) {
        if (!cancel) setErr(e instanceof Error ? e.message : "Failed to load job");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [id, refreshKey]);

  useEffect(() => {
    completionDetailGateRef.current = true;
    setShowCompletionPayModal(false);
  }, [id]);

  const raw = job as Record<string, unknown> | null;

  useEffect(() => {
    if (!job) return;
    if (!jobNeedsCompletionBalanceReminder(job)) return;
    if (!completionDetailGateRef.current) return;
    setShowCompletionPayModal(true);
    completionDetailGateRef.current = false;
  }, [job]);

  const applications = useMemo(() => {
    if (!raw || !Array.isArray(raw.applications)) return [];
    return (raw.applications as RawApplication[]).filter((a) => a && typeof a === "object");
  }, [raw]);

  const approvedWorkerCount = useMemo(() => {
    return applications.filter((a) => {
      const s = safeStr(a.status).toLowerCase();
      return s === "approved" || s === "shortlisted";
    }).length;
  }, [applications]);

  const jobDays = useMemo(() => {
    if (!raw || !Array.isArray(raw.jobDays)) return [];
    return raw.jobDays as JobDayRow[];
  }, [raw]);

  const facilities = useMemo(() => {
    if (!raw || !Array.isArray(raw.facilities)) return [];
    return raw.facilities as { type?: string; provided?: boolean; notes?: string }[];
  }, [raw]);

  const requirements = useMemo(() => {
    if (!raw || !Array.isArray(raw.requirements)) return [];
    return (raw.requirements as unknown[]).map((x) => safeStr(x)).filter(Boolean);
  }, [raw]);

  const documents = useMemo(() => {
    if (!raw || !Array.isArray(raw.documentsRequired)) return [];
    return (raw.documentsRequired as unknown[]).map((x) => safeStr(x)).filter(Boolean);
  }, [raw]);

  const mapsHref = useMemo(() => {
    if (!job) return null;
    const loc = job.location;
    if (!loc || typeof loc !== "object") return null;
    const coords = (loc as { coordinates?: { coordinates?: number[] } }).coordinates?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const [lng, lat] = coords;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }, [job]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-[var(--hirearn-surface)]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Loading job…</p>
      </div>
    );
  }

  if (err || !job) {
    return (
      <div className="min-h-[50vh] bg-[var(--hirearn-surface)] px-4 py-8">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] transition hover:opacity-90"
        >
          <span aria-hidden>←</span> Back to jobs
        </Link>
        <div className="hirearn-card mt-6 rounded-3xl border-red-100 bg-red-50/50 p-6">
          <p className="text-sm font-semibold text-red-800">{err || "Job not found"}</p>
          <p className="mt-2 text-xs font-medium text-red-700/80">Check the link or return to your job list.</p>
        </div>
      </div>
    );
  }

  const isMonthly = job.jobType === "MONTHLY";
  const ui = getUiJobStatus(job);
  const mm = job.monthlyMeta as { salaryMin?: number; salaryMax?: number } | undefined;
  const wage =
    isMonthly && mm?.salaryMin != null && mm?.salaryMax != null
      ? `₹${Number(mm.salaryMin).toLocaleString("en-IN")} – ₹${Number(mm.salaryMax).toLocaleString("en-IN")}/mo`
      : isMonthly
        ? "Salary not specified"
        : job.paymentPerWorker
          ? `₹${Number(job.paymentPerWorker).toLocaleString("en-IN")} total / worker`
          : "—";

  const payoutMode = safeStr(raw?.payoutMode) || "—";
  const dailyBilling = safeStr(raw?.dailyBillingModel) || null;
  const editingAllowed = raw?.editingAllowed === true;
  const allOut = raw?.allWorkersCheckedOut === true;
  const checkInCode = safeStr(raw?.checkInCode);
  const qrCode = safeStr(raw?.qrCode);
  const amountBreakdown = raw?.amountBreakdown as
    | {
        grossAmount?: number;
        platformCommission?: number;
        netAmount?: number;
        tokenAmount?: number;
        remainingAmount?: number;
        tokenPercentage?: number;
      }
    | undefined;

  const specialInstructions = safeStr(raw?.specialInstructions);
  const paymentStatusLower = safeStr(raw?.paymentStatus).toLowerCase();
  const hideUpfrontTokenUi = skipsUpfrontTokenPayment(raw);
  const showTokenPaymentCta =
    !isMonthly &&
    !hideUpfrontTokenUi &&
    (paymentStatusLower === "pending" || paymentStatusLower === "partially_paid");

  const completionOutstandingThisJob = jobNeedsCompletionBalanceReminder(job)
    ? formatEmployerInr(totalOutstandingCompletionAmount([job]))
    : null;

  return (
    <div className="min-h-[60vh] bg-[var(--hirearn-surface)] pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl backdrop-saturate-150 sm:px-0">
        <Link
          href="/jobs"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition active:scale-95"
          aria-label="Back"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold tracking-tight text-slate-900">Job details</h1>
          <p className="truncate text-[11px] font-medium text-slate-500">{job.title}</p>
        </div>
        {!isMonthly ? (
          <Link
            href={"/jobs/" + encodeURIComponent(id) + "/attendance"}
            className="shrink-0 rounded-full border border-[#2563EB]/35 bg-gradient-to-b from-blue-50 to-white px-4 py-2 text-xs font-bold text-[#2563EB] shadow-md shadow-blue-500/15 transition active:scale-[0.98]"
          >
            Attendance
          </Link>
        ) : (
          <span className="w-10 shrink-0" aria-hidden />
        )}
      </header>

      <div className="space-y-4 px-4 pt-4 sm:px-0">
        {showTokenPaymentCta ? (
          <Link
            href={"/jobs/" + encodeURIComponent(id) + "/payment"}
            className="flex items-center justify-between gap-3 rounded-3xl border border-[#2563EB]/25 bg-gradient-to-r from-blue-50/95 to-white px-4 py-4 shadow-md shadow-blue-500/10 transition active:scale-[0.99] hover:border-[#2563EB]/40"
          >
            <div className="min-w-0 text-left">
              <p className="text-sm font-bold text-slate-900">Complete token payment</p>
              <p className="mt-0.5 text-xs font-medium text-slate-600">
                Pay the platform token with wallet or Razorpay before workers join — applies to cash payout jobs.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#2563EB] px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/25">
              Pay →
            </span>
          </Link>
        ) : null}

        <section className="hirearn-card relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2563EB] via-blue-400 to-blue-200/80"
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <MetaChip tone="slate">{ui}</MetaChip>
            <MetaChip tone="neutral">{String(job.status || "—")}</MetaChip>
            {editingAllowed ? <MetaChip tone="emerald">Edits allowed</MetaChip> : <MetaChip tone="amber">Editing locked</MetaChip>}
            {!isMonthly && allOut ? <MetaChip tone="blue">All checked out</MetaChip> : null}
            <MetaChip tone="neutral">{isMonthly ? "Monthly" : "Daily"}</MetaChip>
          </div>

          <h2 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-slate-900">{job.title}</h2>
          {job.description ? (
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{job.description}</p>
          ) : null}

          {specialInstructions ? (
            <div className="mt-5 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-amber-50/40 px-4 py-3 text-sm text-amber-950 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800/90">Instructions</p>
              <p className="mt-1.5 font-medium leading-relaxed">{specialInstructions}</p>
            </div>
          ) : null}

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {!isMonthly ? (
              <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-4 sm:col-span-2">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Schedule</dt>
                <dd className="mt-1.5 text-sm font-semibold leading-snug text-slate-900">
                  {formatDateRange(job)}
                  {formatTimeRange(job) ? ` · ${formatTimeRange(job)}` : ""}
                  {typeof raw?.numberOfDays === "number" && raw.numberOfDays > 1 ? (
                    <span className="font-medium text-slate-500"> · {raw.numberOfDays} days</span>
                  ) : null}
                </dd>
              </div>
            ) : null}
            <div className={"rounded-2xl border border-slate-100/90 bg-slate-50/50 p-4 " + (isMonthly ? "sm:col-span-2" : "")}>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Location</dt>
              <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                {formatLocation(job)}
                {mapsHref ? (
                  <>
                    {" "}
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#2563EB] underline decoration-blue-200 underline-offset-2"
                    >
                      Open in Maps
                    </a>
                  </>
                ) : null}
              </dd>
            </div>
            <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-4">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pay</dt>
              <dd className="mt-1.5 text-sm font-semibold text-slate-900">{wage}</dd>
            </div>
            <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-4">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Workers</dt>
              <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                {job.workersApproved ?? 0} / {job.workersNeeded ?? 0}{" "}
                <span className="font-medium text-slate-600">{isMonthly ? "shortlisted" : "approved"}</span>
              </dd>
            </div>
            {!isMonthly ? (
              <>
                <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-4">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payout</dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">{payoutMode}</dd>
                </div>
                {dailyBilling ? (
                  <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-4">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Billing</dt>
                    <dd className="mt-1.5 text-sm font-semibold text-slate-900">{dailyBilling.replace(/_/g, " ")}</dd>
                  </div>
                ) : null}
              </>
            ) : null}
            {job.category ? (
              <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-4 sm:col-span-2">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</dt>
                <dd className="mt-1.5 text-sm font-semibold text-slate-900">{String(job.category)}</dd>
              </div>
            ) : null}
          </dl>

          {!isMonthly && amountBreakdown && typeof amountBreakdown.grossAmount === "number" ? (
            <div className="mt-5 rounded-2xl border border-blue-100/90 bg-gradient-to-b from-blue-50/80 to-white p-4 text-xs text-slate-700 shadow-inner ring-1 ring-blue-100/50">
              <p className="text-sm font-bold text-slate-900">Payment breakdown</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Per worker · total job</p>
              <ul className="mt-3 space-y-2">
                <li className="flex justify-between gap-2 border-b border-blue-100/60 pb-2">
                  <span className="text-slate-600">Gross</span>
                  <span className="font-bold text-slate-900">₹{Number(amountBreakdown.grossAmount).toLocaleString("en-IN")}</span>
                </li>
                {amountBreakdown.platformCommission != null ? (
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-600">Platform fee (7%)</span>
                    <span className="font-semibold">₹{Number(amountBreakdown.platformCommission).toLocaleString("en-IN")}</span>
                  </li>
                ) : null}
                {amountBreakdown.netAmount != null ? (
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-600">Worker receives (net)</span>
                    <span className="font-bold text-emerald-800">
                      ₹{Number(amountBreakdown.netAmount).toLocaleString("en-IN")}
                    </span>
                  </li>
                ) : null}
                {!hideUpfrontTokenUi &&
                raw?.showDigitalTokenSplitBreakdown === true &&
                amountBreakdown.tokenAmount != null &&
                amountBreakdown.remainingAmount != null ? (
                  <>
                    <li className="flex justify-between gap-2 border-t border-blue-100/80 pt-2">
                      <span className="text-slate-600">Token upfront ({amountBreakdown.tokenPercentage ?? "—"}%)</span>
                      <span className="font-semibold">₹{Number(amountBreakdown.tokenAmount).toLocaleString("en-IN")}</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-600">Remaining</span>
                      <span className="font-semibold">₹{Number(amountBreakdown.remainingAmount).toLocaleString("en-IN")}</span>
                    </li>
                  </>
                ) : null}
                {raw?.skipsInitialPostingPayment === true || hideUpfrontTokenUi ? (
                  <li className="border-t border-blue-100/80 pt-2 text-slate-600">
                    No upfront posting token — pay workers through Hirearn when the job is completed.
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </section>

        {raw ? (
          <>
            <SectionCard
              eyebrow="Actions"
              title="Manage job"
              subtitle="Workers, attendance, messages, edits — same power as the native app."
            >
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <ActionTile href={"/jobs/" + encodeURIComponent(id) + "/workers?tab=pending"}>
                  Pending requests
                </ActionTile>
                <ActionTile href={"/jobs/" + encodeURIComponent(id) + "/workers?tab=approved"}>
                  {isMonthly ? "Shortlisted" : "Approved"}
                </ActionTile>
                {!isMonthly ? (
                  <ActionTile href={"/jobs/" + encodeURIComponent(id) + "/attendance"}>Attendance</ActionTile>
                ) : null}
                <ActionTile href="/messages">Messages</ActionTile>
                {editingAllowed ? (
                  <ActionTile href={"/jobs/" + encodeURIComponent(id) + "/edit"} variant="primary">
                    Edit job
                  </ActionTile>
                ) : null}
                <ActionTile href={"/jobs/" + encodeURIComponent(id) + "/report"}>Report issue</ActionTile>
              </div>
              {approvedWorkerCount > 0 &&
              !["cancelled", "draft", "expired"].includes(safeStr(raw.status).toLowerCase()) ? (
                <button
                  type="button"
                  onClick={() => setBroadcastOpen(true)}
                  className="mt-4 flex w-full items-center justify-between rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 px-4 py-3.5 text-left shadow-[var(--hirearn-shadow-sm)] transition active:scale-[0.99] hover:border-blue-200/60"
                >
                  <span>
                    <span className="text-sm font-bold text-slate-900">Team updates</span>
                    <span className="mt-0.5 block text-xs font-medium text-slate-500">
                      Message all approved workers · {approvedWorkerCount}
                    </span>
                  </span>
                  <span className="text-lg font-light text-slate-300">›</span>
                </button>
              ) : null}
              {(safeStr(raw.status).toLowerCase() === "posted" ||
                safeStr(raw.status).toLowerCase() === "not_accepting_requests") && (
                <button
                  type="button"
                  disabled={!!actionBusy}
                  onClick={async () => {
                    setActionBusy("stop");
                    try {
                      const r = await stopAcceptingRequestsJob(id);
                      alert(r.message || "Updated");
                      refresh();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Failed");
                    } finally {
                      setActionBusy(null);
                    }
                  }}
                  className="mt-3 w-full rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50 to-amber-50/30 py-3 text-sm font-bold text-amber-950 shadow-sm disabled:opacity-50"
                >
                  {actionBusy === "stop"
                    ? "…"
                    : safeStr(raw.status).toLowerCase() === "not_accepting_requests"
                      ? "Resume accepting requests"
                      : "Stop accepting requests"}
                </button>
              )}
              {safeStr(raw.status).toLowerCase() !== "ongoing" ? (
                <button
                  type="button"
                  disabled={!!actionBusy}
                  onClick={() => setDeleteOpen(true)}
                  className="mt-2 w-full rounded-2xl border border-red-200/90 bg-red-50/90 py-3 text-sm font-bold text-red-800 shadow-sm transition disabled:opacity-50"
                >
                  Delete job
                </button>
              ) : null}
            </SectionCard>

            <div id="employer-completion-payment" className="mt-2 scroll-mt-28">
              <JobEmployerActionsPanel jobId={id} raw={raw as Record<string, unknown>} onRefresh={refresh} />
            </div>

            <JobBroadcastsModal
              open={broadcastOpen}
              onClose={() => setBroadcastOpen(false)}
              jobId={id}
              jobTitle={job.title}
            />
            {deleteOpen ? (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
                <div className="hirearn-card w-full max-w-md rounded-3xl border-slate-200/80 p-6 shadow-2xl">
                  <p className="text-base font-bold text-slate-900">Delete this job?</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                    Workers will be notified and this action can&apos;t be undone.
                  </p>
                  <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(false)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy === "del"}
                      onClick={async () => {
                        setActionBusy("del");
                        try {
                          await deleteEmployerJob(id);
                          setDeleteOpen(false);
                          router.push("/jobs");
                        } catch (e) {
                          alert(e instanceof Error ? e.message : "Delete failed");
                        } finally {
                          setActionBusy(null);
                        }
                      }}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/25 disabled:opacity-50"
                    >
                      {actionBusy === "del" ? "…" : "Delete job"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {(checkInCode || qrCode) && !isMonthly ? (
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900">Check-in</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {checkInCode ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Code</p>
                  <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-slate-900">{checkInCode}</p>
                </div>
              ) : null}
              {qrCode ? <QrImage src={qrCode} label="QR" /> : null}
            </div>
          </section>
        ) : null}

        {jobDays.length > 0 && !isMonthly ? (
          <SectionCard eyebrow="Calendar" title="Schedule by day" subtitle="Per-day codes, payments, and attendance.">
            <ul className="mt-4 space-y-3">
              {jobDays.map((day, idx) => {
                const dateRaw = safeStr(day.date);
                const st = safeStr(day.scheduledStartTime);
                const en = safeStr(day.scheduledEndTime);
                const dStatus = safeStr(day.status);
                const cin = safeStr(day.checkInCode);
                const cout = safeStr(day.checkoutCode);
                const payMode = safeStr(day.paymentMode);
                const payStat = safeStr(day.paymentStatus);
                const att = Array.isArray(day.attendance) ? day.attendance : [];
                const cinQr = safeStr(day.checkInQRCode);
                const coutQr = safeStr(day.checkoutQRCode);
                return (
                  <li
                    key={safeStr(day._id) || String(idx)}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 text-sm shadow-[var(--hirearn-shadow-sm)] ring-1 ring-black/[0.03]"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-bold text-slate-900">
                        Day {safeStr(day.dayIndex) || idx + 1}
                        {dateRaw ? <span className="font-semibold text-slate-600"> · {formatDayDate(dateRaw)}</span> : null}
                      </p>
                      <span className="rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                        {dStatus || "—"}
                      </span>
                    </div>
                    {st || en ? (
                      <p className="mt-1 text-xs text-slate-600">
                        {st && en ? `${st} – ${en}` : st || en}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                      {payMode ? <span>Mode: {payMode}</span> : null}
                      {payStat ? <span>Payment: {payStat}</span> : null}
                      <span>Attendance rows: {att.length}</span>
                    </div>
                    {(cin || cout) && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {cin ? (
                          <span>
                            <span className="text-slate-500">In </span>
                            <span className="font-mono font-semibold">{cin}</span>
                          </span>
                        ) : null}
                        {cout ? (
                          <span>
                            <span className="text-slate-500">Out </span>
                            <span className="font-mono font-semibold">{cout}</span>
                          </span>
                        ) : null}
                      </div>
                    )}
                    {(cinQr || coutQr) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {cinQr ? <QrImage src={cinQr} label="Check-in QR" /> : null}
                        {coutQr ? <QrImage src={coutQr} label="Check-out QR" /> : null}
                      </div>
                    )}
                    {payMode.toUpperCase() === "CASH" &&
                    day.employerCashConfirmed !== true &&
                    (payStat === "AWAITING_CASH_CONFIRMATION" ||
                      payStat === "UNPAID" ||
                      dStatus.toUpperCase() === "COMPLETED") &&
                    safeStr(day._id) ? (
                      <button
                        type="button"
                        disabled={cashDayBusy === safeStr(day._id)}
                        onClick={async () => {
                          const jd = safeStr(day._id);
                          if (!jd) return;
                          if (!confirm("Confirm you paid workers in cash for this day?")) return;
                          setCashDayBusy(jd);
                          try {
                            await employerConfirmCashPaymentRequest(id, { jobDayId: jd });
                            refresh();
                          } catch (e) {
                            alert(e instanceof Error ? e.message : "Could not confirm");
                          } finally {
                            setCashDayBusy(null);
                          }
                        }}
                        className="mt-3 w-full rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.99] disabled:opacity-50"
                      >
                        {cashDayBusy === safeStr(day._id)
                          ? "…"
                          : "Confirm cash payment (employer)"}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        ) : null}

        {facilities.some((f) => f.provided !== false) ? (
          <SectionCard eyebrow="Perks" title="Facilities on offer">
            <ul className="mt-4 flex flex-wrap gap-2">
              {facilities
                .filter((f) => f.provided !== false && f.type)
                .map((f) => (
                  <li
                    key={f.type + (f.notes || "")}
                    className="rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-[var(--hirearn-shadow-sm)]"
                  >
                    {FACILITY_LABEL[f.type || ""] || f.type}
                    {f.notes ? ` · ${f.notes}` : ""}
                  </li>
                ))}
            </ul>
          </SectionCard>
        ) : null}

        {requirements.length > 0 ? (
          <SectionCard eyebrow="Criteria" title="Requirements">
            <ul className="mt-4 space-y-2">
              {requirements.map((r) => (
                <li
                  key={r}
                  className="flex gap-2 rounded-xl border border-slate-100/90 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-800"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" aria-hidden />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        {documents.length > 0 ? (
          <SectionCard eyebrow="Files" title="Attachments">
            <ul className="mt-4 space-y-2">
              {documents.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-3 py-3 text-sm font-semibold text-[#2563EB] shadow-[var(--hirearn-shadow-sm)] transition hover:border-blue-200"
                  >
                    <span className="min-w-0 break-all">
                      {url.replace(/^https?:\/\//, "").slice(0, 64)}
                      {url.length > 80 ? "…" : ""}
                    </span>
                    <span className="shrink-0 text-slate-400">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        <SectionCard
          eyebrow="People"
          title={isMonthly ? "Applicants" : "Applications"}
          subtitle={applications.length ? `${applications.length} total` : undefined}
        >
          {applications.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-sm font-medium text-slate-500">
              No applications yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {applications.map((app, i) => {
                const w = applicationWorker(app);
                const name = w?.fullName?.trim() || "Worker";
                const phone = w?.phoneNumber?.trim();
                const st = safeStr(app.status) || "pending";
                const initials =
                  name
                    .split(/\s+/)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "W";
                return (
                  <li
                    key={safeStr(w?._id) + st + i}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[var(--hirearn-shadow-sm)] ring-1 ring-black/[0.02] sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-[#2563EB]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{name}</p>
                        {phone ? (
                          <a
                            href={"tel:" + phone.replace(/\s/g, "")}
                            className="text-sm font-semibold text-[#2563EB] hover:underline"
                          >
                            {phone}
                          </a>
                        ) : (
                          <p className="text-xs font-medium text-slate-500">Phone visible after approval</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={
                        "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize " +
                        statusBadgeClass(st)
                      }
                    >
                      {st}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <EmployerCompletionPaymentModal
        open={showCompletionPayModal}
        variant="job"
        jobs={[job]}
        jobTitle={job.title}
        totalOutstandingLabel={completionOutstandingThisJob}
        onDismiss={() => setShowCompletionPayModal(false)}
        onPayNow={() => {
          setShowCompletionPayModal(false);
          document.getElementById("employer-completion-payment")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
      />
    </div>
  );
}
