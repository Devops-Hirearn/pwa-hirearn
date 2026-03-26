"use client";

import { useCallback, useEffect, useState } from "react";
import {
  completeAndPayRequest,
  confirmJobCompletionRequest,
  getRemainingPaymentSummaryRequest,
  payRemainingBalanceRequest,
} from "@/lib/api/jobActions";
import { createPaymentOrder, getRazorpayKeyId, verifyPayment } from "@/lib/api/payments";
import { openWalletTopupCheckout } from "@/lib/payments/razorpayCheckout";

type Props = {
  jobId: string;
  raw: Record<string, unknown>;
  onRefresh: () => void;
};

function safeLower(s: unknown): string {
  return String(s ?? "").toLowerCase();
}

export function JobEmployerActionsPanel({ jobId, raw, onRefresh }: Props) {
  const jobType = String(raw.jobType ?? "DAILY");
  const status = safeLower(raw.status);
  const payoutMode = String(raw.payoutMode ?? "DIGITAL");
  const paymentStatus = safeLower(raw.paymentStatus);
  const completionConfirmed = raw.completionConfirmed === true;

  const [payInfo, setPayInfo] = useState<{
    totalRemainingAmount: number;
    allWorkersPaid: boolean;
    walletBalance: number;
  } | null>(null);
  const [loadingPay, setLoadingPay] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const jobDays = Array.isArray(raw.jobDays) ? (raw.jobDays as Record<string, unknown>[]) : [];
  const allDaysCompleted =
    jobDays.length > 0 &&
    jobDays.every((d) => String(d.status ?? "").toUpperCase() === "COMPLETED");

  const loadPay = useCallback(async () => {
    if (jobType === "MONTHLY" || payoutMode === "CASH") return;
    setLoadingPay(true);
    try {
      const p = await getRemainingPaymentSummaryRequest(jobId);
      setPayInfo({
        totalRemainingAmount: p.totalRemainingAmount || p.remainingAmount,
        allWorkersPaid: p.allWorkersPaid,
        walletBalance: p.walletBalance,
      });
    } catch {
      setPayInfo(null);
    } finally {
      setLoadingPay(false);
    }
  }, [jobId, jobType, payoutMode]);

  useEffect(() => {
    if (status === "ongoing" || status === "posted" || status === "completed") {
      void loadPay();
    }
  }, [status, loadPay]);

  async function runRazorpayRemaining(amount: number) {
    setBusy("rzp");
    setMsg("");
    try {
      const keyId = await getRazorpayKeyId();
      const created = await createPaymentOrder({
        amount,
        type: "job_remaining_payment",
        jobId,
        paymentMethod: { type: "card" },
      });
      const order = created.order;
      const paymentId = created.paymentId;
      if (!order?.id) throw new Error("Invalid payment order");

      await openWalletTopupCheckout({
        keyId,
        amountPaise: order.amount,
        orderId: order.id,
        description: "Pay workers — remaining balance",
        onSuccess: async (r) => {
          setBusy("verify");
          try {
            await verifyPayment({
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
              paymentId,
            });
            await payRemainingBalanceRequest(jobId, { paymentId });
            setMsg("Payment recorded.");
            onRefresh();
            await loadPay();
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Verification failed");
          } finally {
            setBusy(null);
          }
        },
        onDismiss: (m) => {
          if (m) setMsg(m);
          setBusy(null);
        },
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Payment failed");
      setBusy(null);
    }
  }

  async function onPayWalletRemaining() {
    if (!payInfo || payInfo.totalRemainingAmount <= 0) return;
    if (!confirm("Pay ₹" + payInfo.totalRemainingAmount + " from your wallet?")) return;
    setBusy("wallet");
    setMsg("");
    try {
      await payRemainingBalanceRequest(jobId, { useWallet: true });
      setMsg("Paid from wallet.");
      onRefresh();
      await loadPay();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Wallet payment failed");
    } finally {
      setBusy(null);
    }
  }

  async function onCompleteAndPayFlow() {
    setBusy("complete");
    setMsg("");
    try {
      const res = await completeAndPayRequest(jobId);
      if (res.requiresExtraApproval) {
        setMsg(
          "Extra time payment needs approval. Open the Hirearn app to review and approve extra work, then try again.",
        );
        setBusy(null);
        return;
      }
      const remaining = Number(res.remainingAmount) || 0;
      if (remaining > 0) {
        await loadPay();
        setMsg("Complete worker payment below (₹" + remaining + " or use summary).");
      } else {
        setMsg("Job settlement updated.");
        onRefresh();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not complete");
    } finally {
      setBusy(null);
    }
  }

  async function onConfirmCashCompletion() {
    if (!confirm("Confirm this job is fully completed (cash mode)?")) return;
    setBusy("confirm");
    setMsg("");
    try {
      await confirmJobCompletionRequest(jobId);
      setMsg("Job completion confirmed.");
      onRefresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to confirm");
    } finally {
      setBusy(null);
    }
  }

  if (jobType === "MONTHLY") {
    return (
      <section className="hirearn-card rounded-3xl p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Payments</p>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Monthly roles</h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
          Salary and hiring workflows for monthly jobs are fully available in the Hirearn mobile app. Use the
          app if you need steps that aren&apos;t shown here yet.
        </p>
      </section>
    );
  }

  if (status === "cancelled" || status === "draft" || status === "expired") {
    return null;
  }

  const completedNeedsSettlement =
    status === "completed" && (paymentStatus === "pending" || paymentStatus === "partially_paid");

  const showDigitalPay =
    payoutMode === "DIGITAL" &&
    (status === "ongoing" || status === "posted" || completedNeedsSettlement) &&
    payInfo &&
    payInfo.totalRemainingAmount > 0 &&
    !payInfo.allWorkersPaid;

  const showCashConfirm =
    payoutMode === "CASH" &&
    !completionConfirmed &&
    (status === "ongoing" || status === "posted") &&
    allDaysCompleted;

  const showCompletionFlow =
    payoutMode === "DIGITAL" &&
    !completionConfirmed &&
    allDaysCompleted &&
    status !== "completed" &&
    (!payInfo || payInfo.allWorkersPaid || payInfo.totalRemainingAmount <= 0);

  return (
    <section className="hirearn-card rounded-3xl p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Settlement</p>
      <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Completion &amp; payments</h3>
      {msg ? (
        <p className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
          {msg}
        </p>
      ) : null}

      {loadingPay ? (
        <p className="mt-3 text-xs font-semibold text-slate-500">Loading payment summary…</p>
      ) : null}

      {showDigitalPay && payInfo ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-blue-100/80 bg-gradient-to-b from-blue-50/50 to-white p-4">
          <p className="text-sm font-medium text-slate-700">
            Remaining to workers:{" "}
            <span className="text-lg font-bold text-slate-900">
              ₹{payInfo.totalRemainingAmount.toLocaleString("en-IN")}
            </span>
            {payInfo.walletBalance > 0 ? (
              <span className="block text-xs font-medium text-slate-500 sm:mt-1 sm:inline sm:ml-2">
                Wallet balance ₹{payInfo.walletBalance.toLocaleString("en-IN")}
              </span>
            ) : null}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void runRazorpayRemaining(payInfo.totalRemainingAmount)}
              className="hirearn-btn-primary flex-1 px-4 py-3 text-sm disabled:opacity-50"
            >
              {busy === "verify" ? "Verifying…" : "Pay with Razorpay"}
            </button>
            <button
              type="button"
              disabled={!!busy || payInfo.walletBalance < payInfo.totalRemainingAmount}
              onClick={() => void onPayWalletRemaining()}
              className="flex-1 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm disabled:opacity-50"
            >
              {busy === "wallet" ? "…" : "Pay from wallet"}
            </button>
          </div>
        </div>
      ) : null}

      {payoutMode === "DIGITAL" && (status === "ongoing" || status === "posted") && !allDaysCompleted ? (
        <p className="mt-3 text-sm font-medium text-slate-600">Finish all job days before final worker payments.</p>
      ) : null}

      {showCompletionFlow ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void onCompleteAndPayFlow()}
            className="w-full rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-white py-3 text-sm font-bold text-emerald-950 shadow-sm disabled:opacity-50"
          >
            {busy === "complete" ? "Processing…" : "Complete & settle job"}
          </button>
        </div>
      ) : null}

      {showCashConfirm ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void onConfirmCashCompletion()}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 disabled:opacity-50"
          >
            {busy === "confirm" ? "…" : "Confirm job completed (cash)"}
          </button>
        </div>
      ) : null}

      {completionConfirmed || (status === "completed" && paymentStatus === "fully_paid") ? (
        <p className="mt-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm font-bold text-emerald-900">
          All payments complete for this job.
        </p>
      ) : null}
    </section>
  );
}
