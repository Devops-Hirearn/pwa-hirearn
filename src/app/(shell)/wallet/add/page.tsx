"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getWalletBalance } from "@/lib/api/employer";
import { createPaymentOrder, getRazorpayKeyId, verifyPayment } from "@/lib/api/payments";
import { openWalletTopupCheckout } from "@/lib/payments/razorpayCheckout";

const QUICK = [100, 500, 1000, 2000, 5000];

export default function AddMoneyPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getWalletBalance()
      .then((b) => setBalance(b.balance ?? 0))
      .catch(() => setBalance(null));
  }, []);

  async function onProceed() {
    setError("");
    const n = parseFloat(amount);
    if (!amount || Number.isNaN(n) || n <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (n < 10) {
      setError("Minimum amount is ₹10");
      return;
    }

    try {
      setLoading(true);
      const keyId = await getRazorpayKeyId();
      const created = await createPaymentOrder({ amount: n, type: "wallet_topup" });
      const order = created.order;
      const paymentId = created.paymentId;
      if (!order?.id) throw new Error("Invalid order from server");
      setLoading(false);

      await openWalletTopupCheckout({
        keyId,
        amountPaise: order.amount,
        orderId: order.id,
        description: "Add money to Hirearn wallet",
        onSuccess: async (r) => {
          setLoading(true);
          try {
            await verifyPayment({
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
              paymentId,
            });
            await refreshBalance();
            router.push("/wallet");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Verification failed");
          } finally {
            setLoading(false);
          }
        },
        onDismiss: (msg) => {
          if (msg) setError(msg);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment");
      setLoading(false);
    }
  }

  async function refreshBalance() {
    try {
      const b = await getWalletBalance();
      setBalance(b.balance ?? 0);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-[60vh] w-full bg-slate-50">
      <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link href="/wallet" className="text-lg text-slate-800">
          ←
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Add money</h1>
      </header>

      <div className="mx-auto w-full max-w-lg px-4 py-6">
        {balance != null ? (
          <p className="mb-4 text-center text-sm text-slate-600">
            Current balance:{" "}
            <span className="font-semibold text-slate-900">
              ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </p>
        ) : null}

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <label className="text-xs font-medium text-slate-600">Amount (INR)</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-lg font-medium outline-none focus:border-[#2563EB]"
            inputMode="decimal"
            placeholder="500"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                onClick={() => setAmount(String(q))}
              >
                ₹{q}
              </button>
            ))}
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <button
            type="button"
            disabled={loading}
            onClick={onProceed}
            className="mt-5 w-full rounded-xl bg-[#2563EB] py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Please wait…" : "Pay with Razorpay"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            Secured by Razorpay. Same flow as the Hirearn Android app.
          </p>
        </div>
      </div>
    </div>
  );
}
