export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (ev: string, fn: (res: { error?: { description?: string } }) => void) => void;
    };
  }
}

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export async function openWalletTopupCheckout(opts: {
  keyId: string;
  amountPaise: number;
  orderId: string;
  description: string;
  onSuccess: (r: RazorpaySuccess) => void | Promise<void>;
  onDismiss: (message?: string) => void;
  prefillContact?: string;
}) {
  await loadRazorpayScript();
  const R = window.Razorpay;
  if (!R) {
    opts.onDismiss("Razorpay failed to load");
    return;
  }
  const rzp = new R({
    key: opts.keyId,
    amount: opts.amountPaise,
    currency: "INR",
    name: "Hirearn",
    description: opts.description,
    order_id: opts.orderId,
    ...(opts.prefillContact
      ? { prefill: { contact: opts.prefillContact } }
      : {}),
    handler: (response: RazorpaySuccess) => {
      void opts.onSuccess(response);
    },
    theme: { color: "#2563EB" },
    modal: {
      ondismiss: () => opts.onDismiss(),
    },
  });
  rzp.on("payment.failed", (response: { error?: { description?: string } }) => {
    opts.onDismiss(response?.error?.description || "Payment failed");
  });
  rzp.open();
}
