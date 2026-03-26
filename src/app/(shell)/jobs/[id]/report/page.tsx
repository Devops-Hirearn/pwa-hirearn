"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { createDisputeRequest } from "@/lib/api/jobActions";

const CATEGORIES = [
  { label: "Payment issue", value: "payment_issue" },
  { label: "Attendance dispute", value: "attendance_dispute" },
  { label: "Job not completed", value: "job_not_completed" },
  { label: "Quality issue", value: "quality_issue" },
  { label: "Safety concern", value: "safety_concern" },
  { label: "Other", value: "other" },
] as const;

export default function ReportJobIssuePage() {
  const params = useParams();
  const router = useRouter();
  const jobId = typeof params.id === "string" ? params.id : "";
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"] | "">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId || !category) {
      setErr("Choose a category");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      await createDisputeRequest({
        jobId,
        category,
        description: description.trim() || undefined,
      });
      alert("Your issue has been reported. Our team will review it shortly.");
      router.push("/jobs/" + encodeURIComponent(jobId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-svh bg-slate-50 pb-12">
      <header className="flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-3">
        <Link
          href={jobId ? "/jobs/" + encodeURIComponent(jobId) : "/jobs"}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200"
        >
          ←
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Report issue</h1>
      </header>
      <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <div>
          <label className="text-xs font-medium text-slate-600">Category</label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            required
          >
            <option value="">Select…</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Details (optional)</label>
          <textarea
            className="mt-1 min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened"
          />
        </div>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </div>
  );
}
