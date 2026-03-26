"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getJobPaymentSummaryRequest, payForJobRequest } from "@/lib/api/jobActions";
import { createPaymentOrder, getRazorpayKeyId, verifyPayment } from "@/lib/api/payments";
import {
  parseJobPaymentSummary,
  settlementAmounts,
  shouldSkipPaymentScreen,
  tokenDueNow,
  type JobPaymentSummaryVM,
} from "@/lib/jobs/paymentSummary";
import { openWalletTopupCheckout } from "@/lib/payments/razorpayCheckout";

function formatRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function contact10(userPhone: string | undefined): string | undefined {
  if (!userPhone) return undefined;
  let p = userPhone.replace(/^\+91\s*/, "").replace(/\D/g, "");
  if (p.length > 10) p = p.slice(-10);
  return p.length === 10 ? p : undefined;
}

export default function JobPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [vm, setVm] = useState<JobPaymentSummaryVM | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const prefillContact = useMemo(() => contact10(user?.phoneNumber), [user?.phoneNumber]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!jobId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErr("");
      try {
        const data = await getJobPaymentSummaryRequest(jobId);
        if (shouldSkipPaymentScreen(data)) {
          router.replace("/jobs/" + encodeURIComponent(jobId));
          return;
        }
        const parsed = parseJobPaymentSummary(data, jobId);
        const due = tokenDueNow(parsed);
        const st = parsed.paymentStatus.toLowerCase();
        if (due <= 0 && (st === "fully_paid" || st === "paid")) {
          router.replace("/jobs/" + encodeURIComponent(jobId));
          return;
        }
        setVm(parsed);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not load payment summary");
        setVm(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [jobId, router],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const { tokenDue, walletApplied, amountToPayRupees } = useMemo(() => {
    if (!vm) return { tokenDue: 0, walletApplied: 0, amountToPayRupees: 0 };
    return settlementAmounts(vm, useWallet);
  }, [vm, useWallet]);

  async function onPay() {
    if (!vm || !jobId || submitting) return;
    setSubmitting(true);
    setErr("");
    try {
      if (amountToPayRupees <= 0) {
        await payForJobRequest(jobId, {
          useWallet: true,
          ...(walletApplied > 0 ? { walletAmount: walletApplied } : {}),
        });
        router.replace("/jobs/" + encodeURIComponent(jobId));
        return;
      }

      const keyId = await getRazorpayKeyId();
      const created = await createPaymentOrder({
        amount: amountToPayRupees,
        type: "job_payment",
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
        description: "Job token — Hirearn",
        prefillContact,
        onSuccess: async (r) => {
          try {
            await verifyPayment({
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
              paymentId,
            });
            await payForJobRequest(jobId, {
              paymentId,
              useWallet: walletApplied > 0,
              ...(walletApplied > 0 ? { walletAmount: walletApplied } : {}),
            });
            router.replace("/jobs/" + encodeURIComponent(jobId));
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Could not finalize payment");
          } finally {
            setSubmitting(false);
          }
        },
        onDismiss: (msg) => {
          if (msg) setErr(msg);
          setSubmitting(false);
        },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Payment failed to start");
      setSubmitting(false);
    }
  }

  if (!jobId) {
    return <p className="p-6 text-sm text-red-700">Invalid job</p>;
  }

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-[var(--hirearn-surface)]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Loading payment summary…</p>
      </div>
    );
  }

  if (err && !vm) {
    return (
      <div className="min-h-svh bg-[var(--hirearn-surface)] px-4 py-8">
        <Link href={"/jobs/" + encodeURIComponent(jobId)} className="text-sm font-semibold text-[#2563EB]">
          ← Back to job
        </Link>
        <div className="hirearn-card mt-6 rounded-3xl border-red-100 bg-red-50/80 p-6">
          <p className="font-bold text-red-900">{err}</p>
        </div>
      </div>
    );
  }

  if (!vm) return null;

  const nd = vm.numberOfDays;
  const perDayGross = nd > 1 ? Math.round(vm.paymentPerWorker / nd) : vm.paymentPerWorker;

  return (
    <div className="min-h-svh bg-[var(--hirearn-surface)] pb-14">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-4 py-3 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href={"/jobs/" + encodeURIComponent(jobId)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition active:scale-95"
            aria-label="Back"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight text-slate-900">Payment summary</h1>
            <p className="text-[11px] font-medium text-slate-500">Token &amp; platform fee (upfront)</p>
          </div>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void load(true)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-5">
        {err ? (
          <div className="rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm font-semibold text-red-800">
            {err}
          </div>
        ) : null}

        {tokenDue <= 0 ? (
          <section className="hirearn-card rounded-3xl p-6 text-center">
            <p className="text-lg font-bold text-slate-900">You&apos;re all set</p>
            <p className="mt-2 text-sm font-medium text-slate-600">No token payment is due for this job right now.</p>
            <Link
              href={"/jobs/" + encodeURIComponent(jobId)}
              className="hirearn-btn-primary mt-5 inline-flex w-full items-center justify-center no-underline"
            >
              Back to job
            </Link>
          </section>
        ) : null}

        <section className="hirearn-card relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2563EB] via-blue-400 to-blue-200/80"
            aria-hidden
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Job</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{vm.title}</h2>
          {(vm.dateLabel || vm.timeLabel) && (
            <p className="mt-2 text-sm font-medium text-slate-600">
              {vm.dateLabel}
              {vm.timeLabel ? ` · ${vm.timeLabel}` : ""}
            </p>
          )}
          <p className="mt-3 text-sm text-slate-600">
            <span className="font-bold text-slate-900">{vm.workersNeeded}</span> workers
            {nd > 1 ? (
              <span className="text-slate-500"> · {nd} days</span>
            ) : null}
          </p>

          <div className="mt-5 space-y-3 rounded-2xl border border-slate-100/90 bg-slate-50/60 p-4">
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-slate-600">{nd > 1 ? "Gross / worker (full job)" : "Gross / worker"}</span>
              <span className="font-bold text-slate-900">{formatRupee(vm.paymentPerWorker)}</span>
            </div>
            {nd > 1 ? (
              <p className="text-xs font-medium text-slate-500">About {formatRupee(perDayGross)} per day</p>
            ) : null}
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-slate-600">Platform fee / worker</span>
              <span className="font-semibold text-slate-800">{formatRupee(vm.platformFeePerWorker)}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-slate-600">Worker receives (net) / worker</span>
              <span className="font-bold text-emerald-800">{formatRupee(vm.workerReceivesPerWorker)}</span>
            </div>
          </div>

          {vm.payoutMode === "CASH" ? (
            <div className="mt-4 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-3">
              <p className="text-sm font-bold text-amber-950">Cash payout mode</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-amber-900/90">
                Hirearn does not handle cash to workers. You pay wages in cash on site. The amount below is the
                non-refundable platform token (plus any wallet rules from your agreement).
              </p>
              <p className="mt-2 text-xs font-semibold text-amber-900">
                Plan roughly {formatRupee(vm.workerReceivesPerWorker)} × {vm.workersNeeded} workers ={" "}
                {formatRupee(vm.totalNetAmount || vm.workerReceivesPerWorker * vm.workersNeeded)} total cash to workers
                {nd > 1 ? ` (${nd}-day job).` : "."}
              </p>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-blue-100/90 bg-gradient-to-b from-blue-50/70 to-white p-4 shadow-inner">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800/80">Due now</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium text-slate-600">Total job cost</span>
                <span className="font-bold text-slate-900">{formatRupee(vm.totalGross)}</span>
              </div>
              <div className="flex justify-between gap-2 border-t border-blue-100/80 pt-2">
                <span className="font-medium text-slate-600">
                  {vm.payoutMode === "CASH" ? "Token (pay now)" : "Token (upfront)"}
                </span>
                <span className="text-lg font-bold text-[#2563EB]">{formatRupee(tokenDue)}</span>
              </div>
              {vm.payoutMode === "DIGITAL" && vm.totalRemainingAmount > 0 ? (
                <div className="flex justify-between gap-2 text-slate-600">
                  <span>After completion (approx.)</span>
                  <span className="font-semibold text-slate-800">{formatRupee(vm.totalRemainingAmount)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {tokenDue > 0 ? (
          <section className="hirearn-card rounded-3xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Wallet</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatRupee(vm.walletBalance)}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">Available to apply to this token</p>
              </div>
              <Link
                href="/wallet/add"
                className="shrink-0 rounded-full border border-[#2563EB]/35 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-[#2563EB]"
              >
                Add money
              </Link>
            </div>
            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 py-3">
              <input
                type="checkbox"
                checked={useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                disabled={vm.walletBalance <= 0}
                className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] disabled:opacity-40"
              />
              <span className="text-sm font-semibold text-slate-800">Use wallet for this payment</span>
            </label>
            {useWallet && walletApplied > 0 ? (
              <p className="mt-3 text-xs font-medium text-slate-600">
                Applying {formatRupee(walletApplied)} from wallet
                {amountToPayRupees > 0 ? (
                  <span className="text-slate-900"> · Pay {formatRupee(amountToPayRupees)} via Razorpay</span>
                ) : (
                  <span className="font-bold text-emerald-800"> · Covers full token</span>
                )}
              </p>
            ) : null}
            <button
              type="button"
              disabled={submitting}
              onClick={() => void onPay()}
              className="hirearn-btn-primary mt-5 w-full py-4 text-[15px] disabled:opacity-60"
            >
              {submitting
                ? "Processing…"
                : amountToPayRupees <= 0
                  ? "Pay with wallet"
                  : walletApplied > 0
                    ? `Pay ${formatRupee(amountToPayRupees)} with Razorpay`
                    : "Pay with Razorpay"}
            </button>
            <p className="mt-3 text-center text-[11px] font-medium text-slate-500">Secured by Razorpay · Same flow as the Hirearn app</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
