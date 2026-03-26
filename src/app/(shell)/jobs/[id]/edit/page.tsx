"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { FormSectionCard, formFieldLabelClass, formInputClass, formTextareaClass } from "@/components/employer/FormSectionCard";
import { getJobDetailPayload } from "@/lib/api/jobAttendance";
import { updateEmployerJob } from "@/lib/api/jobActions";

/** Pull YYYY-MM-DD for date input */
function dateInputVal(v: unknown): string {
  if (v == null) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [jobType, setJobType] = useState<"DAILY" | "MONTHLY">("DAILY");
  const [editingAllowed, setEditingAllowed] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workersNeeded, setWorkersNeeded] = useState("1");
  const [paymentPerWorker, setPaymentPerWorker] = useState("");
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [isMultiDay, setIsMultiDay] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const j = await getJobDetailPayload(jobId);
        if (cancel) return;
        setEditingAllowed(j.editingAllowed !== false);
        setJobType(j.jobType === "MONTHLY" ? "MONTHLY" : "DAILY");
        setTitle(String(j.title ?? ""));
        setDescription(String(j.description ?? ""));
        setWorkersNeeded(String(j.workersNeeded ?? 1));
        setPaymentPerWorker(String(Number(j.paymentPerWorker) || ""));
        setIsMultiDay(j.isMultiDay === true);
        if (j.isMultiDay) {
          setStartDate(dateInputVal(j.startDate));
          setEndDate(dateInputVal(j.endDate));
        } else {
          setDate(dateInputVal(j.date));
        }
        setStartTime(String(j.startTime ?? "09:00").slice(0, 5));
        setEndTime(String(j.endTime ?? "18:00").slice(0, 5));
        const loc = j.location;
        if (loc && typeof loc === "object") {
          const L = loc as Record<string, unknown>;
          setAddress(String(L.address ?? ""));
          setCity(String(L.city ?? ""));
          setState(String(L.state ?? ""));
          setPincode(String(L.pincode ?? ""));
          setLandmark(String(L.landmark ?? ""));
        }
      } catch (e) {
        if (!cancel) setErr(e instanceof Error ? e.message : "Failed to load job");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [jobId]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!jobId) return;
    if (!editingAllowed) {
      setErr("This job can no longer be edited.");
      return;
    }
    const wn = Number(workersNeeded);
    if (!title.trim() || Number.isNaN(wn) || wn < 1) {
      setErr("Title and valid workers needed are required.");
      return;
    }

    setSaving(true);
    setErr("");
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        workersNeeded: wn,
        category: "General",
        startTime,
        endTime,
        location: {
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          landmark: landmark.trim() || undefined,
        },
      };

      if (jobType === "DAILY") {
        const pay = Number(paymentPerWorker);
        if (!Number.isNaN(pay) && pay >= 0) payload.paymentPerWorker = pay;
        if (isMultiDay) {
          if (!startDate || !endDate) {
            setSaving(false);
            return setErr("Start and end dates required for multi-day jobs.");
          }
          payload.startDate = startDate;
          payload.endDate = endDate;
        } else {
          if (!date) {
            setSaving(false);
            return setErr("Job date is required.");
          }
          payload.date = date;
        }
      }

      const updateRes = await updateEmployerJob(jobId, payload);
      const extra = Number((updateRes as { paymentRequired?: unknown }).paymentRequired ?? 0);
      if (extra > 0) {
        router.push("/jobs/" + encodeURIComponent(jobId) + "/payment");
      } else {
        router.push("/jobs/" + encodeURIComponent(jobId));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!jobId) {
    return (
      <div className="p-6">
        <p className="text-sm font-semibold text-red-700">Invalid job</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-[var(--hirearn-surface)]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Loading job…</p>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-[var(--hirearn-surface)] pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl backdrop-saturate-150">
        <Link
          href={"/jobs/" + encodeURIComponent(jobId)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition active:scale-95"
          aria-label="Back to job"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold tracking-tight text-slate-900">Edit job</h1>
          <p className="truncate text-[11px] font-medium text-slate-500">
            {jobType === "MONTHLY" ? "Monthly listing" : "Daily listing"} · {editingAllowed ? "Changes save to workers" : "Read only"}
          </p>
        </div>
        <span
          className={
            "shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider " +
            (jobType === "MONTHLY"
              ? "border-violet-200/90 bg-violet-50 text-violet-900"
              : "border-blue-200/90 bg-blue-50 text-blue-900")
          }
        >
          {jobType === "MONTHLY" ? "Monthly" : "Daily"}
        </span>
      </header>

      <form onSubmit={onSave} className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:space-y-5">
        {!editingAllowed ? (
          <div className="rounded-3xl border border-amber-200/90 bg-gradient-to-b from-amber-50 to-amber-50/30 px-4 py-4 shadow-sm">
            <p className="text-sm font-bold text-amber-950">Editing is locked</p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-amber-900/85">
              This job has already moved forward. Open Workers, Attendance, or payments from job details.
            </p>
          </div>
        ) : null}

        {jobType === "MONTHLY" ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white/80 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
            Monthly jobs: you can update title, description, headcount, and location here. Salary band and other
            fields might need the mobile app if the API rejects this save.
          </div>
        ) : null}

        <FormSectionCard eyebrow="Overview" title="Role details">
          <div>
            <label className={formFieldLabelClass}>Title</label>
            <input
              className={formInputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!editingAllowed}
              required
            />
          </div>
          <div>
            <label className={formFieldLabelClass}>Description</label>
            <textarea
              className={formTextareaClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!editingAllowed}
            />
          </div>
          <div>
            <label className={formFieldLabelClass}>Workers needed</label>
            <input
              type="number"
              min={1}
              className={formInputClass}
              value={workersNeeded}
              onChange={(e) => setWorkersNeeded(e.target.value)}
              disabled={!editingAllowed}
            />
          </div>
        </FormSectionCard>

        {jobType === "DAILY" ? (
          <FormSectionCard
            eyebrow="Schedule & pay"
            title="Timing & compensation"
            subtitle={isMultiDay ? "Multi-day job — dates were set when you created it." : "Single-day schedule."}
          >
            <div>
              <label className={formFieldLabelClass}>Payment per worker (total ₹)</label>
              <input
                type="number"
                min={0}
                className={formInputClass}
                value={paymentPerWorker}
                onChange={(e) => setPaymentPerWorker(e.target.value)}
                disabled={!editingAllowed}
              />
            </div>
            {isMultiDay ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={formFieldLabelClass}>Start date</label>
                  <input
                    type="date"
                    className={formInputClass}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={!editingAllowed}
                  />
                </div>
                <div>
                  <label className={formFieldLabelClass}>End date</label>
                  <input
                    type="date"
                    className={formInputClass}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={!editingAllowed}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className={formFieldLabelClass}>Job date</label>
                <input
                  type="date"
                  className={formInputClass}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!editingAllowed}
                />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={formFieldLabelClass}>Start time</label>
                <input
                  type="time"
                  className={formInputClass}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!editingAllowed}
                />
              </div>
              <div>
                <label className={formFieldLabelClass}>End time</label>
                <input
                  type="time"
                  className={formInputClass}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!editingAllowed}
                />
              </div>
            </div>
          </FormSectionCard>
        ) : null}

        <FormSectionCard eyebrow="Location" title="Work site address">
          <div>
            <label className={formFieldLabelClass}>Street &amp; building</label>
            <input
              className={formInputClass}
              placeholder="Full address line"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!editingAllowed}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={formFieldLabelClass}>City</label>
              <input
                className={formInputClass}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!editingAllowed}
              />
            </div>
            <div>
              <label className={formFieldLabelClass}>State</label>
              <input
                className={formInputClass}
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={!editingAllowed}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={formFieldLabelClass}>Pincode</label>
              <input
                className={formInputClass}
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={!editingAllowed}
              />
            </div>
            <div>
              <label className={formFieldLabelClass}>Landmark (optional)</label>
              <input className={formInputClass} value={landmark} onChange={(e) => setLandmark(e.target.value)} disabled={!editingAllowed} />
            </div>
          </div>
        </FormSectionCard>

        {err ? (
          <div className="rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm font-semibold text-red-800">
            {err}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving || !editingAllowed}
          className="hirearn-btn-primary w-full py-4 text-[15px] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
