import { apiRequest, BASE_URL } from "./client";

export async function getJobDetailPayload(id: string): Promise<Record<string, unknown>> {
  const data = await apiRequest<Record<string, unknown>>("/jobs/" + encodeURIComponent(id));
  return (data.job ?? data) as Record<string, unknown>;
}

export async function getJobQrCode(id: string) {
  return apiRequest<{
    isMultiDay?: boolean;
    qrCode?: string;
    checkInCode?: string;
    checkoutQRCode?: string;
    checkoutCode?: string;
    dayIndex?: number;
  }>("/jobs/" + encodeURIComponent(id) + "/qr-code");
}

export async function generateCheckoutCode(jobId: string) {
  return apiRequest<{ checkoutCode: string; checkoutQRCode: string; expiresAt: string }>(
    "/jobs/" + encodeURIComponent(jobId) + "/generate-checkout-code",
    { method: "POST" },
  );
}

export async function employerManualCheckout(jobId: string, workerIds: string[]) {
  return apiRequest<{
    success?: boolean;
    message?: string;
    checkedOutWorkers?: string[];
    errors?: string[];
  }>("/jobs/" + encodeURIComponent(jobId) + "/checkout/manual", {
    method: "POST",
    body: JSON.stringify({ workerIds }),
  });
}

export async function replaceWorkerRequest(
  jobId: string,
  jobDayId: string,
  workerId: string,
  reason: string,
) {
  return apiRequest<{
    success?: boolean;
    replacementSuccess?: boolean;
    message?: string;
  }>(
    "/jobs/" +
      encodeURIComponent(jobId) +
      "/job-days/" +
      encodeURIComponent(jobDayId) +
      "/replace-worker",
    {
      method: "POST",
      body: JSON.stringify({ workerId, reason }),
    },
  );
}

export async function fetchAttendanceList(jobId: string): Promise<unknown[]> {
  try {
    const data = await apiRequest<unknown>("/jobs/" + encodeURIComponent(jobId) + "/attendance");
    if (Array.isArray(data)) return data;
    const r = data as Record<string, unknown>;
    if (Array.isArray(r.data)) return r.data as unknown[];
    if (Array.isArray(r.attendance)) return r.attendance as unknown[];
    if (Array.isArray(r.records)) return r.records as unknown[];
  } catch {
    /* fallback below */
  }
  return [];
}

export type TodayAttendanceCardItem = {
  workerName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalWorkTime: number;
  payableAmount: number;
  status: "Completed" | "In Progress" | "No Show";
  lateCheckIn: boolean;
  earlyCheckout: boolean;
};

export async function getTodayAttendanceCard(jobId: string) {
  return apiRequest<{
    success?: boolean;
    attendanceCards?: TodayAttendanceCardItem[];
    date?: string;
    isMultiDay?: boolean;
  }>("/jobs/" + encodeURIComponent(jobId) + "/attendance/today-card");
}

/** Base URL without trailing /api for resolving relative upload paths. */
export function apiOriginForUploads(): string {
  return BASE_URL.replace(/\/?api\/?$/, "");
}
