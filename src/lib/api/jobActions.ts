import { apiRequest } from "./client";

export type JobBroadcast = {
  id?: string;
  _id?: string;
  body: string;
  recipientCount?: number;
  notifiedCount?: number;
  createdAt?: string;
};

export async function deleteEmployerJob(id: string) {
  return apiRequest<{ success?: boolean; message?: string }>("/jobs/" + encodeURIComponent(id), {
    method: "DELETE",
  });
}

export async function updateEmployerJob(id: string, data: Record<string, unknown>) {
  return apiRequest<{ success?: boolean; job?: unknown; message?: string; paymentRequired?: number }>(
    "/jobs/" + encodeURIComponent(id),
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
}

export async function stopAcceptingRequestsJob(id: string) {
  return apiRequest<{
    success: boolean;
    message?: string;
    job?: { id: string; status: string };
  }>("/jobs/" + encodeURIComponent(id) + "/stop-accepting-requests", {
    method: "PUT",
  });
}

export async function sendJobBroadcast(jobId: string, message: string) {
  return apiRequest<{
    success?: boolean;
    message?: string;
    stats?: { recipients: number; notified: number; skipped: number; failed: number };
  }>("/jobs/" + encodeURIComponent(jobId) + "/broadcast", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function getJobBroadcasts(jobId: string, limit = 50) {
  return apiRequest<{ success?: boolean; broadcasts?: JobBroadcast[] }>(
    "/jobs/" + encodeURIComponent(jobId) + "/broadcasts?limit=" + limit,
  );
}

export async function confirmJobCompletionRequest(id: string) {
  return apiRequest("/jobs/" + encodeURIComponent(id) + "/confirm-completion", {
    method: "PUT",
  });
}

/** Initial / edited job token payment — same as mobile GET /jobs/:id/payment-summary */
export async function getJobPaymentSummaryRequest(id: string) {
  return apiRequest<Record<string, unknown>>("/jobs/" + encodeURIComponent(id) + "/payment-summary");
}

export async function getRemainingPaymentSummaryRequest(id: string) {
  const data = await apiRequest<Record<string, unknown>>(
    "/jobs/" + encodeURIComponent(id) + "/remaining-payment-summary",
  );
  return {
    totalRemainingAmount: Number(data.totalRemainingAmount ?? data.remainingAmount) || 0,
    remainingAmount: Number(data.remainingAmount) || 0,
    unpaidWorkersCount: Number(data.unpaidWorkersCount) || 0,
    walletBalance: Number(data.walletBalance) || 0,
    allWorkersPaid: data.allWorkersPaid === true,
    raw: data,
  };
}

export async function payRemainingBalanceRequest(
  id: string,
  body: { paymentId?: string; useWallet?: boolean },
) {
  return apiRequest("/jobs/" + encodeURIComponent(id) + "/pay-remaining", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function payForJobRequest(
  id: string,
  body: { paymentId?: string; useWallet?: boolean; walletAmount?: number },
) {
  return apiRequest("/jobs/" + encodeURIComponent(id) + "/pay", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function completeAndPayRequest(id: string) {
  return apiRequest<{
    success?: boolean;
    requiresExtraApproval?: boolean;
    extraAmount?: number;
    extraMinutes?: number;
    extraWorkDetails?: unknown[];
    remainingAmount?: number;
    message?: string;
  }>("/jobs/" + encodeURIComponent(id) + "/complete-and-pay", {
    method: "POST",
  });
}

export async function approveExtraWorkRequest(
  jobId: string,
  body: { jobDayId: string; workerId: string; approvedExtraAmount: number },
) {
  return apiRequest("/jobs/" + encodeURIComponent(jobId) + "/approve-extra-work", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function employerConfirmCashPaymentRequest(
  jobId: string,
  body: { jobDayId: string; amount?: number },
) {
  return apiRequest("/jobs/" + encodeURIComponent(jobId) + "/cash-confirm/employer", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getRefundRequestForJob(jobId: string) {
  return apiRequest<{ success?: boolean; refundRequest?: Record<string, unknown> }>(
    "/jobs/" + encodeURIComponent(jobId) + "/refund-request",
  );
}

export async function submitRefundRequestForJob(
  jobId: string,
  data: {
    refundMethod: "UPI" | "BANK";
    upiId?: string;
    bankAccountNumber?: string;
    ifscCode?: string;
    note?: string;
  },
) {
  return apiRequest("/jobs/" + encodeURIComponent(jobId) + "/refund-request", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateApplicationStatusRequest(
  jobId: string,
  applicationId: string,
  status: "approved" | "rejected" | "shortlisted" | "pending",
) {
  return apiRequest("/jobs/" + encodeURIComponent(jobId) + "/applications/" + encodeURIComponent(applicationId), {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function createDisputeRequest(data: {
  jobId: string;
  category:
    | "payment_issue"
    | "attendance_dispute"
    | "job_not_completed"
    | "quality_issue"
    | "safety_concern"
    | "other";
  description?: string;
}) {
  return apiRequest("/disputes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
