import { getApiBaseUrl } from "../config";
import type { AppUser, SendOtpResponse, VerifyOtpResponse } from "./types";

const ACCESS_TOKEN_KEY = "authToken";

export const BASE_URL = getApiBaseUrl();

function normalizeUser(raw: Record<string, unknown> | null | undefined): AppUser | null {
  if (!raw || typeof raw !== "object") return null;
  const u = { ...raw } as Record<string, unknown>;
  if (u._id && !u.id) u.id = String(u._id);
  return u as unknown as AppUser;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

/** Authenticated JSON API request (same behavior as the mobile app). */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = BASE_URL + path;
  const token = getStoredToken();

  const headers: Record<string, string> = {};
  if (init.headers instanceof Headers) {
    init.headers.forEach((v, k) => {
      headers[k] = v;
    });
  } else if (Array.isArray(init.headers)) {
    for (const [k, v] of init.headers) headers[k] = v;
  } else if (init.headers && typeof init.headers === "object") {
    Object.assign(headers, init.headers);
  }

  if (!headers["Content-Type"] && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const d = data as { message?: string };
    const msg =
      (typeof d.message === "string" && d.message) ||
      "Request failed (" + res.status + ")";
    const err = new Error(msg) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = data;
    if (res.status === 401) clearStoredToken();
    throw err;
  }

  return data as T;
}

export function sendOtp(phoneNumber: string) {
  return apiRequest<SendOtpResponse>("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export async function verifyOtp(
  phoneNumber: string,
  otp: string,
  role?: "worker" | "employer",
  termsAccepted?: boolean,
  privacyAccepted?: boolean,
) {
  const data = await apiRequest<VerifyOtpResponse>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      phoneNumber,
      otp,
      role,
      termsAccepted: termsAccepted === true,
      privacyAccepted: privacyAccepted === true,
    }),
  });
  if (data.token) setStoredToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const data = await apiRequest<{ user?: Record<string, unknown> }>("/auth/me");
  return normalizeUser(data.user);
}
