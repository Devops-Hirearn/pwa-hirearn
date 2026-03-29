import { apiRequest } from "./client";
import type { EmployerJob } from "./types";

/** Same as mobile `getEmployerBillingConfig` — drives digital fee copy and breakdown. */
export async function getEmployerBillingConfig(): Promise<{
  success?: boolean;
  defaultDailyBillingModel?: string;
  showDigitalUpfrontTokenSplit?: boolean;
} | null> {
  try {
    return await apiRequest<{
      success?: boolean;
      defaultDailyBillingModel?: string;
      showDigitalUpfrontTokenSplit?: boolean;
    }>("/jobs/billing-config");
  } catch {
    return null;
  }
}

export async function createEmployerJob(payload: Record<string, unknown>) {
  const res = await apiRequest<{
    success?: boolean;
    job?: Record<string, unknown>;
    message?: string;
    kycRequired?: boolean;
  }>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const job = res.job;
  const id = job ? String(job._id || job.id || "") : "";
  return {
    job: job as unknown as EmployerJob | undefined,
    id,
    message: res.message,
    kycRequired: res.kycRequired === true,
  };
}
