import type { EmployerJob, EmployerJobLocation } from "@/lib/api/types";

export type UiJobStatus = "upcoming" | "ongoing" | "completed" | "expired" | "cancelled";

const IST: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata" };

export function safeString(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

export function formatIST(iso: string, pattern: "shortDate" | "weekdayShort" | "timeRange"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (pattern === "weekdayShort") {
    return d.toLocaleDateString("en-IN", { ...IST, weekday: "short", day: "2-digit", month: "short" });
  }
  if (pattern === "shortDate") {
    return d.toLocaleDateString("en-IN", { ...IST, day: "2-digit", month: "short", year: "numeric" });
  }
  return d.toLocaleTimeString("en-IN", { ...IST, hour: "2-digit", minute: "2-digit" });
}

export function formatDateRange(job: EmployerJob): string {
  try {
    const startDate = job.startDate;
    const endDate = job.endDate;
    const hasStart = startDate != null;
    const hasEnd = endDate != null;
    const isMultiDay = job.isMultiDay || (hasStart && hasEnd);
    if (isMultiDay && typeof startDate === "string" && typeof endDate === "string") {
      return (
        formatIST(startDate, "weekdayShort") +
        " → " +
        formatIST(endDate, "weekdayShort")
      );
    }
    if (typeof job.date === "string") {
      return formatIST(job.date, "weekdayShort");
    }
  } catch {
    /* ignore */
  }
  if (typeof job.date === "string") return formatIST(job.date, "shortDate");
  return "";
}

export function formatTimeRange(job: EmployerJob): string {
  try {
    if (job.isMultiDay && Array.isArray(job.jobDays) && job.jobDays.length > 0) {
      const first = job.jobDays[0] as Record<string, unknown>;
      const last = job.jobDays[job.jobDays.length - 1] as Record<string, unknown>;
      const sd = safeString(first?.scheduledStartTime);
      const ed = safeString(last?.scheduledEndTime);
      const day = safeString(first?.date || job.startDate || job.date);
      if (sd && ed) return formatJobTimeFromStrings(day, sd, ed);
    }
    const startTime = safeString(job.startTime).trim();
    const endTime = safeString(job.endTime).trim();
    const dayRef = typeof job.date === "string" ? job.date : safeString(job.startDate);
    if (startTime && endTime) return formatJobTimeFromStrings(dayRef, startTime, endTime);
    if (startTime) return formatJobTimeFromStrings(dayRef, startTime, startTime);
    if (endTime) return formatJobTimeFromStrings(dayRef, endTime, endTime);
  } catch {
    /* ignore */
  }
  return "Time not set";
}

/** Best-effort 12h range label for Indian locale (matches mobile intent). */
function formatJobTimeFromStrings(dateRef: string, startTime: string, endTime: string): string {
  if (!dateRef) return startTime + " – " + endTime;
  const parseClock = (t: string) => {
    const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    return { h: Number(m[1]), min: Number(m[2]) };
  };
  const a = parseClock(startTime);
  const b = parseClock(endTime);
  if (!a || !b) return startTime + " – " + endTime;
  const base = new Date(dateRef);
  if (Number.isNaN(base.getTime())) return startTime + " – " + endTime;
  const s = new Date(base);
  s.setHours(a.h, a.min, 0, 0);
  const e = new Date(base);
  e.setHours(b.h, b.min, 0, 0);
  const opts: Intl.DateTimeFormatOptions = { ...IST, hour: "numeric", minute: "2-digit" };
  return s.toLocaleTimeString("en-IN", opts) + " – " + e.toLocaleTimeString("en-IN", opts);
}

export function formatLocation(job: EmployerJob): string {
  const loc = job.location;
  if (!loc) return "Location not specified";
  if (typeof loc === "string") return loc.trim() || "Location not specified";
  const L = loc as EmployerJobLocation;
  const parts = [L.address, L.city, L.state, L.pincode].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
  return parts.length ? parts.join(", ") : "Location not specified";
}

/** Same rules as mobile MyJobs — backend status only; expired uses jobDays if present. */
export function getUiJobStatus(job: EmployerJob): UiJobStatus {
  if (job.isMultiDay && Array.isArray(job.jobDays) && job.jobDays.length > 0) {
    const allExpired = job.jobDays.every(
      (day) => (day as { status?: string })?.status === "EXPIRED",
    );
    if (allExpired) return "expired";
  }
  const backendStatus = safeString(job.status).toLowerCase();
  if (backendStatus === "expired") return "expired";
  if (backendStatus === "completed") return "completed";
  if (backendStatus === "ongoing") return "ongoing";
  if (backendStatus === "cancelled") return "cancelled";
  return "upcoming";
}

export type JobCardModel = {
  id: string;
  title: string;
  dateLine: string;
  timeLine: string;
  locationLine: string;
  workersApproved: number;
  workersNeeded: number;
  wageLabel: string;
  isMonthly: boolean;
  uiStatus: UiJobStatus;
  backendStatus: string;
  isFull: boolean;
  accentColor: string;
  raw: EmployerJob;
};

export function jobToCardModel(job: EmployerJob): JobCardModel {
  const uiStatus = getUiJobStatus(job);
  const accentMap: Record<UiJobStatus, string> = {
    upcoming: "#8B5CF6",
    ongoing: "#3B82F6",
    completed: "#10B981",
    expired: "#EF4444",
    cancelled: "#6B7280",
  };
  const isMonthly = job.jobType === "MONTHLY";
  const workersApproved = Number(job.workersApproved) || 0;
  const workersNeeded = Number(job.workersNeeded) || 0;
  const isFull = workersNeeded > 0 && workersApproved >= workersNeeded;
  const mm = job.monthlyMeta as { salaryMin?: number; salaryMax?: number } | undefined;
  const wageLabel =
    isMonthly && mm?.salaryMin != null && mm?.salaryMax != null
      ? "₹" +
        mm.salaryMin.toLocaleString("en-IN") +
        " – ₹" +
        mm.salaryMax.toLocaleString("en-IN") +
        "/month"
      : isMonthly
        ? "Salary not specified"
        : job.paymentPerWorker
          ? "₹" + Number(job.paymentPerWorker).toLocaleString("en-IN")
          : "Wage not specified";

  return {
    id: job.id,
    title: job.title || "Untitled Job",
    dateLine: isMonthly ? "" : formatDateRange(job),
    timeLine: isMonthly ? "" : formatTimeRange(job),
    locationLine: formatLocation(job),
    workersApproved,
    workersNeeded,
    wageLabel,
    isMonthly,
    uiStatus,
    backendStatus: safeString(job.status) || "posted",
    isFull,
    accentColor: accentMap[uiStatus],
    raw: job,
  };
}

export function filterActiveJobs(jobs: EmployerJob[], jobType: "DAILY" | "MONTHLY"): EmployerJob[] {
  return jobs.filter((job) => {
    const status = safeString(job.status).toLowerCase();
    const isNotTerminal = !["completed", "expired", "cancelled"].includes(status);
    const jt = (job.jobType as string) || "DAILY";
    return isNotTerminal && jt === jobType;
  });
}
