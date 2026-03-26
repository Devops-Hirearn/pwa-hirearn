import { apiRequest } from "./client";
import type { EmployerJob } from "./types";

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
