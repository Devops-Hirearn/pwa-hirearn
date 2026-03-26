import { formatAttendanceTimeOnly, formatISTDateTimeAttendance } from "@/lib/time/attendanceDisplay";

export type AttendanceUiStatus = "checkedIn" | "notCheckedIn" | "checkedOut";

export type EmployerAttendanceRecord = {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
  status: AttendanceUiStatus;
  checkInTime?: string;
  checkOutTime?: string;
  checkInDateTime?: string;
  checkOutDateTime?: string;
  checkoutMethod?: "QR_CODE" | "MANUAL_CODE" | "EMPLOYER_MANUAL" | "SYSTEM_AUTO";
  workerId?: string;
};

function getISTDateKey(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Pick today's job day QR/codes (same logic as mobile Attendance.tsx). */
export function mergeTodayJobDayCodes(jobPayload: Record<string, unknown>): void {
  const isMultiDay =
    jobPayload.isMultiDay === true ||
    (Array.isArray(jobPayload.jobDays) && (jobPayload.jobDays as unknown[]).length > 0);
  if (!isMultiDay || !Array.isArray(jobPayload.jobDays)) return;

  const days = jobPayload.jobDays as Record<string, unknown>[];
  const todayKey = getISTDateKey(new Date());

  const todayJobDay =
    days.find((day) => {
      if (!day.date) return false;
      return getISTDateKey(String(day.date)) === todayKey;
    }) || days[0];

  if (!todayJobDay) return;

  if (todayJobDay.checkInQRCode) jobPayload.qrCode = todayJobDay.checkInQRCode;
  if (todayJobDay.checkInCode) jobPayload.checkInCode = todayJobDay.checkInCode;
  if (todayJobDay.checkoutCode) jobPayload.checkoutCode = todayJobDay.checkoutCode;
  if (todayJobDay.checkoutQRCode) jobPayload.checkoutQRCode = todayJobDay.checkoutQRCode;
}

export function normalizeEmployerAttendanceItem(item: unknown): EmployerAttendanceRecord {
  if (!item || typeof item !== "object") {
    return { id: Math.random().toString(36).slice(2), name: "Unknown", status: "notCheckedIn" };
  }
  const rec = item as Record<string, unknown>;
  const worker = typeof rec.worker === "object" && rec.worker !== null ? (rec.worker as Record<string, unknown>) : null;

  const id = String(rec.id ?? rec._id ?? worker?._id ?? worker?.id ?? Math.random().toString(36).slice(2));
  const name = String(
    rec.name ??
      rec.fullName ??
      worker?.fullName ??
      worker?.name ??
      (rec.user as Record<string, unknown>)?.name ??
      (rec.user as Record<string, unknown>)?.fullName ??
      "Unknown",
  );
  const age = rec.age != null ? Number(rec.age) : worker?.age != null ? Number(worker.age) : undefined;
  const gender =
    (rec.gender as string) ?? (worker?.gender != null ? String(worker.gender) : undefined);
  const phoneNumber =
    (rec.phoneNumber as string) ?? (worker?.phoneNumber != null ? String(worker.phoneNumber) : undefined);
  const profilePhotoUrl =
    (worker?.profilePhoto as string) ??
    (worker?.avatarUrl as string) ??
    (rec.profilePhoto as string) ??
    (rec.avatarUrl as string) ??
    undefined;

  let workerId: string | undefined =
    worker?._id != null
      ? String(worker._id)
      : worker?.id != null
        ? String(worker.id)
        : typeof rec.worker === "string"
          ? rec.worker
          : undefined;
  if (!workerId && rec.workerId != null) workerId = String(rec.workerId);

  const checkInTime = (rec.checkInTime ??
    rec.checkin_time ??
    rec.checkInAt ??
    rec.check_in_at ??
    rec.check_in) as string | undefined;
  const checkOutTime = (rec.checkOutTime ??
    rec.checkout_time ??
    rec.checkOutAt ??
    rec.check_out) as string | undefined;
  const checkoutMethod = rec.checkoutMethod as EmployerAttendanceRecord["checkoutMethod"] | undefined;

  let status: AttendanceUiStatus = "notCheckedIn";
  if (checkOutTime) status = "checkedOut";
  else if (checkInTime) status = "checkedIn";
  else {
    const statusRaw = String(rec.status ?? rec.attendanceStatus ?? "").toLowerCase();
    if (statusRaw.includes("out") || statusRaw.includes("checkedout") || statusRaw.includes("checkout")) {
      status = "checkedOut";
    } else if (statusRaw.includes("in") || statusRaw.includes("checkedin") || statusRaw.includes("checkin")) {
      status = "checkedIn";
    }
  }

  const fmtTime = (t: unknown) => (t ? formatAttendanceTimeOnly(String(t)) : undefined);
  const fmtDt = (t: unknown) => (t ? formatISTDateTimeAttendance(String(t)) : undefined);

  return {
    id,
    name,
    age,
    gender,
    phoneNumber,
    profilePhotoUrl,
    status,
    checkInTime: fmtTime(checkInTime),
    checkOutTime: fmtTime(checkOutTime),
    checkInDateTime: fmtDt(checkInTime),
    checkOutDateTime: fmtDt(checkOutTime),
    checkoutMethod,
    workerId,
  };
}

export function canReplaceWorkerForJob(
  jobData: Record<string, unknown> | null,
  record: EmployerAttendanceRecord,
): { canReplace: boolean; jobDayId?: string; reason?: string } {
  if (!jobData) return { canReplace: false, reason: "Job data not loaded" };
  if (record.status !== "notCheckedIn") {
    return { canReplace: false, reason: `Worker status is: ${record.status}` };
  }
  if (!record.workerId) return { canReplace: false, reason: "Worker ID is missing" };

  const todayKey = getISTDateKey(new Date());

  if (jobData.isMultiDay === true && Array.isArray(jobData.jobDays) && jobData.jobDays.length > 0) {
    const days = jobData.jobDays as Record<string, unknown>[];
    const todayJobDay =
      days.find((day) => day.date && getISTDateKey(String(day.date)) === todayKey) || null;
    if (!todayJobDay?._id) return { canReplace: false, reason: "Today is not a job day" };

    const applications = Array.isArray(jobData.applications) ? jobData.applications : [];
    const isApproved = applications.some((app: unknown) => {
      if (!app || typeof app !== "object") return false;
      const a = app as Record<string, unknown>;
      const w = a.worker;
      let appWorkerId = "";
      if (w && typeof w === "object") {
        const wo = w as Record<string, unknown>;
        appWorkerId = String(wo._id ?? wo.id ?? "");
      } else if (w != null) appWorkerId = String(w);
      return appWorkerId === record.workerId && String(a.status) === "approved";
    });
    if (!isApproved) return { canReplace: false, reason: "Worker is not approved" };

    const attendance = Array.isArray(todayJobDay.attendance) ? todayJobDay.attendance : [];
    const workerAttendance = attendance.find((att: unknown) => {
      if (!att || typeof att !== "object") return false;
      const at = att as Record<string, unknown>;
      const w = at.worker;
      let wid = "";
      if (w && typeof w === "object") wid = String((w as Record<string, unknown>)._id ?? (w as Record<string, unknown>).id);
      else if (w != null) wid = String(w);
      return wid === record.workerId;
    }) as Record<string, unknown> | undefined;

    const st = workerAttendance?.status != null ? String(workerAttendance.status) : "";
    if (st === "NO_SHOW" || st === "REPLACED") return { canReplace: false, reason: "Worker already replaced" };

    return { canReplace: true, jobDayId: String(todayJobDay._id) };
  }

  if (jobData.date) {
    const jobDateKey = getISTDateKey(String(jobData.date));
    if (jobDateKey !== todayKey) return { canReplace: false, reason: "Today is not the job day" };

    const applications = Array.isArray(jobData.applications) ? jobData.applications : [];
    const isApproved = applications.some((app: unknown) => {
      if (!app || typeof app !== "object") return false;
      const a = app as Record<string, unknown>;
      const w = a.worker;
      let appWorkerId = "";
      if (w && typeof w === "object") {
        const wo = w as Record<string, unknown>;
        appWorkerId = String(wo._id ?? wo.id ?? "");
      } else if (w != null) appWorkerId = String(w);
      return appWorkerId === record.workerId && String(a.status) === "approved";
    });
    if (!isApproved) return { canReplace: false, reason: "Worker is not approved" };

    let jobDay: Record<string, unknown> | undefined;
    if (Array.isArray(jobData.jobDays)) {
      jobDay = (jobData.jobDays as Record<string, unknown>[]).find((d) => Number(d.dayIndex) === 1);
    }
    if (jobDay?._id) return { canReplace: true, jobDayId: String(jobDay._id) };
  }

  return { canReplace: false };
}
