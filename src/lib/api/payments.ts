import { apiRequest, BASE_URL } from "./client";

let razorpayKeyCache: string | null = null;

/** Public endpoint — same as mobile. */
export async function getRazorpayKeyId(): Promise<string> {
  if (razorpayKeyCache) return razorpayKeyCache;
  const res = await fetch(BASE_URL + "/payments/razorpay-key");
  const data = (await res.json()) as { success?: boolean; keyId?: string; message?: string };
  if (!res.ok || !data.success || !data.keyId) {
    throw new Error(data.message || "Could not load payment gateway");
  }
  razorpayKeyCache = data.keyId;
  return data.keyId;
}

export async function createPaymentOrder(body: {
  amount: number;
  type: "wallet_topup" | "job_payment" | "job_remaining_payment" | "job_posting_additional_payment" | "deposit_add";
  jobId?: string;
  paymentMethod?: { type: string };
}) {
  return apiRequest<{
    order: { id: string; amount: number; currency: string; receipt: string };
    paymentId: string;
  }>("/payments/create-order", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function verifyPayment(body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  paymentId: string;
}) {
  return apiRequest("/payments/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
