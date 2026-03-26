/**
 * Normalizes GET /jobs/:id/payment-summary for the employer payment UI (aligned with mobile PaymentSummary).
 */

export type JobPaymentSummaryVM = {
  jobId: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  workersNeeded: number;
  numberOfDays: number;
  payoutMode: "DIGITAL" | "CASH";
  paymentPerWorker: number;
  platformFeePerWorker: number;
  workerReceivesPerWorker: number;
  totalGross: number;
  totalTokenAmount: number;
  totalRemainingAmount: number;
  totalNetAmount: number;
  paymentRequired: number;
  requiredTotalToken: number;
  alreadyPaidToken: number;
  walletBalance: number;
  paymentStatus: string;
  skipsInitialPostingPayment: boolean;
  /** Cash jobs: total token from job when totalTokenAmount not set */
  cashModeTokenAmount: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function payoutFrom(data: Record<string, unknown>, jobObj: Record<string, unknown>): "DIGITAL" | "CASH" {
  const p = (jobObj.payoutMode ?? data.payoutMode ?? data.job)?.toString().toUpperCase();
  return p === "CASH" ? "CASH" : "DIGITAL";
}

/** Amount due now (token / top-up), same priority as mobile. */
export function tokenDueNow(vm: JobPaymentSummaryVM): number {
  if (vm.paymentRequired > 0) return vm.paymentRequired;
  if (vm.totalTokenAmount > 0) return vm.totalTokenAmount;
  if (vm.payoutMode === "CASH" && vm.cashModeTokenAmount > 0) return vm.cashModeTokenAmount;
  return 0;
}

export function settlementAmounts(vm: JobPaymentSummaryVM, useWallet: boolean): {
  tokenDue: number;
  walletApplied: number;
  amountToPayRupees: number;
} {
  const tokenDue = tokenDueNow(vm);
  const w = Math.max(0, vm.walletBalance);
  const walletApplied = useWallet ? Math.min(w, tokenDue) : 0;
  const amountToPayRupees = Math.max(0, tokenDue - walletApplied);
  return { tokenDue, walletApplied, amountToPayRupees };
}

export function shouldSkipPaymentScreen(data: Record<string, unknown>): boolean {
  const skips = data.skipsInitialPostingPayment === true;
  const payReq = num(data.paymentRequired);
  const job = (data.job ?? {}) as Record<string, unknown>;
  const payout = payoutFrom(data, job);
  return skips && payReq <= 0 && payout === "DIGITAL";
}

export function parseJobPaymentSummary(data: Record<string, unknown>, jobId: string): JobPaymentSummaryVM {
  const jobObj = (data.job ?? {}) as Record<string, unknown>;
  const workers = num(jobObj.workersNeeded ?? data.workersNeeded) || 1;

  const tokenAmountPerWorker = num(
    data.tokenAmountPerWorker ??
      (data.summary && typeof data.summary === "object"
        ? num((data.summary as Record<string, unknown>).tokenAmount) / workers
        : 0),
  );
  const remainingAmountPerWorker = num(
    data.remainingAmountPerWorker ??
      (data.summary && typeof data.summary === "object"
        ? num((data.summary as Record<string, unknown>).remainingAmount) / workers
        : 0),
  );
  const summary = (data.summary ?? {}) as Record<string, unknown>;
  const grossAmountPerWorker = num(
    data.grossAmountPerWorker ?? summary.grossAmount ?? jobObj.paymentPerWorker ?? jobObj.grossAmount,
  );
  const netAmountPerWorker = num(data.netAmountPerWorker ?? summary.netAmount ?? summary.workerReceives);
  let platformCommissionPerWorker = num(
    data.platformCommissionPerWorker ?? summary.platformCommission ?? summary.platformFee,
  );

  const totalTokenAmount = num(
    data.totalTokenAmount ?? (summary.tokenAmount != null ? num(summary.tokenAmount) : tokenAmountPerWorker * workers),
  );
  const totalRemainingAmount = num(
    data.totalRemainingAmount ??
      (summary.remainingAmount != null ? num(summary.remainingAmount) : remainingAmountPerWorker * workers),
  );

  const paymentRequired = num(data.paymentRequired);
  const requiredTotalToken = num(data.requiredTotalToken) || totalTokenAmount;
  const alreadyPaidToken = num(data.alreadyPaidToken);

  let finalPaymentPerWorker = grossAmountPerWorker || num(jobObj.paymentPerWorker) || num(jobObj.grossAmount);
  if (!platformCommissionPerWorker && finalPaymentPerWorker) {
    platformCommissionPerWorker = Math.round(finalPaymentPerWorker * 0.07);
  }
  const finalWorkerReceives =
    netAmountPerWorker || (finalPaymentPerWorker ? finalPaymentPerWorker - platformCommissionPerWorker : 0);

  const totalGrossAmount = num(
    data.totalGrossAmount ?? jobObj.totalAmount ?? finalPaymentPerWorker * workers,
  );
  const totalNetAmount = num(data.totalNetAmount) || finalWorkerReceives * workers;

  const startD = jobObj.startDate ? String(jobObj.startDate) : "";
  const endD = jobObj.endDate ? String(jobObj.endDate) : "";
  let calculatedNumberOfDays = num(jobObj.numberOfDays);
  if (!calculatedNumberOfDays) calculatedNumberOfDays = num(data.numberOfDays);
  if (!calculatedNumberOfDays && startD && endD) {
    calculatedNumberOfDays =
      Math.ceil((new Date(endD).getTime() - new Date(startD).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
  if (!calculatedNumberOfDays) calculatedNumberOfDays = 1;

  const dateRaw = jobObj.date ? String(jobObj.date) : "";
  let dateLabel = "";
  if (dateRaw) {
    const d = new Date(dateRaw);
    dateLabel = Number.isNaN(d.getTime())
      ? dateRaw
      : d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  }
  const st = jobObj.startTime != null ? String(jobObj.startTime).slice(0, 5) : "";
  const en = jobObj.endTime != null ? String(jobObj.endTime).slice(0, 5) : "";
  const timeLabel = st && en ? `${st} – ${en}` : st || en;

  return {
    jobId,
    title: String(jobObj.title ?? "Job"),
    dateLabel,
    timeLabel,
    workersNeeded: workers,
    numberOfDays: Math.max(1, Math.round(calculatedNumberOfDays)),
    payoutMode: payoutFrom(data, jobObj),
    paymentPerWorker: finalPaymentPerWorker,
    platformFeePerWorker: platformCommissionPerWorker,
    workerReceivesPerWorker: finalWorkerReceives,
    totalGross: totalGrossAmount,
    totalTokenAmount,
    totalRemainingAmount,
    totalNetAmount,
    paymentRequired,
    requiredTotalToken,
    alreadyPaidToken,
    walletBalance: num(data.walletBalance),
    paymentStatus: String(data.paymentStatus ?? "pending"),
    skipsInitialPostingPayment: data.skipsInitialPostingPayment === true,
    cashModeTokenAmount: num(jobObj.cashModeTokenAmount ?? data.cashModeTokenAmount),
  };
}
