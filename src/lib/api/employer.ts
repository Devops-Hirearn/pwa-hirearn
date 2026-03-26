import { apiRequest } from "./client";
import type { Conversation, EmployerJob, WalletBalance, WalletTransaction } from "./types";

function normalizeJob(raw: Record<string, unknown>): EmployerJob {
  const id = String(raw.id || raw._id || "");
  return {
    ...raw,
    id,
    title: (raw.title as string) || "Untitled Job",
    workersNeeded: Number(raw.workersNeeded) || 0,
    workersApproved: Number(raw.workersApproved) || 0,
    paymentPerWorker: Number(raw.paymentPerWorker) || 0,
    status: String(raw.status || "posted"),
  } as EmployerJob;
}

export async function getMyJobs(): Promise<EmployerJob[]> {
  const response = await apiRequest<Record<string, unknown>>("/jobs/my-jobs");
  let jobs: unknown[] = [];
  if (Array.isArray(response)) jobs = response;
  else if (Array.isArray(response.jobs)) jobs = response.jobs as unknown[];
  else if (Array.isArray(response.data)) jobs = response.data as unknown[];
  return jobs.map((j) => normalizeJob(j as Record<string, unknown>));
}

export async function getJob(id: string): Promise<EmployerJob> {
  const response = await apiRequest<Record<string, unknown>>("/jobs/" + encodeURIComponent(id));
  const jobData = (response.job || response) as Record<string, unknown>;
  return normalizeJob(jobData);
}

export async function getWalletBalance(): Promise<WalletBalance> {
  const res = await apiRequest<Record<string, unknown>>("/wallet/balance");
  return {
    balance: Number(res.balance) || 0,
    pendingPayouts: res.pendingPayouts != null ? Number(res.pendingPayouts) : undefined,
    totalEarned: res.totalEarned != null ? Number(res.totalEarned) : undefined,
    totalPaidOut: res.totalPaidOut != null ? Number(res.totalPaidOut) : undefined,
  };
}

export async function getWalletTransactionsPage(page: number, limit: number) {
  return apiRequest<unknown>(
    "/wallet/transactions?page=" + page + "&limit=" + limit,
  );
}

/** Fetch transactions (handles multiple response shapes like the mobile app). */
export async function getAllWalletTransactions(): Promise<WalletTransaction[]> {
  const limit = 50;
  let page = 1;
  const all: WalletTransaction[] = [];
  let hasMore = true;

  function extract(response: unknown): WalletTransaction[] {
    if (Array.isArray(response)) return response as WalletTransaction[];
    const r = response as Record<string, unknown>;
    if (Array.isArray(r?.transactions)) {
      return (r.transactions as Record<string, unknown>[]).map((t) => ({
        ...t,
        id: String(t.id || t._id || ""),
        jobTitle:
          (t.jobTitle as string) ||
          (typeof t.job === "object" && t.job && (t.job as { title?: string }).title) ||
          undefined,
      })) as WalletTransaction[];
    }
    if (Array.isArray(r?.data)) return r.data as WalletTransaction[];
    return [];
  }

  while (hasMore) {
    const response = await getWalletTransactionsPage(page, limit);
    const slice = extract(response);
    all.push(...slice);
    const r = response as Record<string, unknown>;
    const totalPages = typeof r?.totalPages === "number" ? r.totalPages : undefined;
    const currentPage = typeof r?.currentPage === "number" ? r.currentPage : page;
    if (typeof totalPages === "number") {
      hasMore = currentPage < totalPages;
    } else {
      hasMore = slice.length === limit;
    }
    page += 1;
    if (page > 100) hasMore = false;
  }

  return all.map((t) => ({
    ...t,
    id: String(t.id || (t as { _id?: string })._id || Math.random()),
  }));
}

export async function getConversations(): Promise<Conversation[]> {
  const response = await apiRequest<Record<string, unknown>>("/messages/conversations");
  let list: unknown[] = [];
  if (Array.isArray(response)) list = response;
  else if (Array.isArray(response.conversations)) list = response.conversations as unknown[];
  else if (Array.isArray(response.data)) list = response.data as unknown[];
  return list as Conversation[];
}

export async function getNotifications(params?: { read?: boolean; limit?: number }) {
  const sp = new URLSearchParams();
  sp.set("limit", String(params?.limit ?? 50));
  if (params?.read !== undefined) sp.set("read", String(params.read));
  const q = "?" + sp.toString();
  const response = await apiRequest<Record<string, unknown>>("/notifications" + q);
  let notifications: unknown[] = [];
  if (Array.isArray(response)) notifications = response;
  else if (Array.isArray(response.notifications))
    notifications = response.notifications as unknown[];
  else if (Array.isArray(response.data)) notifications = response.data as unknown[];
  return notifications as Record<string, unknown>[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const list = await getNotifications({ read: false, limit: 100 });
    return list.length;
  } catch {
    return 0;
  }
}
