"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getJobDetailPayload } from "@/lib/api/jobAttendance";
import { updateApplicationStatusRequest } from "@/lib/api/jobActions";
import { getPresignedViewUrl } from "@/lib/uploads/presignView";
import { apiOriginForUploads } from "@/lib/api/jobAttendance";

type Tab = "pending" | "approved";

type ApplicationRow = {
  applicationId: string;
  workerId: string;
  name: string;
  phone?: string;
  photo?: string;
  status: string;
};

function extractApplications(job: Record<string, unknown>): ApplicationRow[] {
  const apps = Array.isArray(job.applications) ? job.applications : [];
  const attendance = Array.isArray(job.attendance) ? (job.attendance as Record<string, unknown>[]) : [];
  const out: ApplicationRow[] = [];

  for (const raw of apps) {
    if (!raw || typeof raw !== "object") continue;
    const app = raw as Record<string, unknown>;
    if (app.status === "rejected") continue;

    const w = app.worker;
    let workerId = "";
    let name = "Worker";
    let phone: string | undefined;
    let photo: string | undefined;
    if (w && typeof w === "object") {
      const wo = w as Record<string, unknown>;
      workerId = String(wo._id ?? wo.id ?? "");
      name = String(wo.fullName ?? wo.name ?? "Worker");
      phone = wo.phoneNumber != null ? String(wo.phoneNumber) : undefined;
      photo =
        (wo.profilePhoto as string) || (wo.avatarUrl as string) || undefined;
    } else if (w != null) {
      workerId = String(w);
    }

    const applicationId = String(app._id ?? app.id ?? "");
    if (!applicationId || !workerId) continue;

    const att = attendance.find((a) => {
      const aw = a.worker;
      if (aw && typeof aw === "object") {
        const wid = String((aw as { _id?: string })._id ?? "");
        return wid === workerId;
      }
      return String(aw) === workerId;
    });
    if (att?.status === "NO_SHOW" || att?.status === "REPLACED") continue;

    out.push({
      applicationId,
      workerId,
      name,
      phone,
      photo,
      status: String(app.status || "pending"),
    });
  }
  return out;
}

export default function JobWorkersPage() {
  const params = useParams();
  const jobId = typeof params.id === "string" ? params.id : "";
  const [tab, setTab] = useState<Tab>("pending");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("tab");
    setTab(q === "approved" ? "approved" : "pending");
  }, [jobId]);

  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState("");
  const [jobType, setJobType] = useState<string>("DAILY");
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const resolvePhoto = useCallback(async (uri?: string) => {
    if (!uri) return null;
    const origin = apiOriginForUploads();
    if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
      return `${origin}${uri.startsWith("/") ? uri : "/" + uri}`;
    }
    if (uri.includes(".s3.")) {
      try {
        return await getPresignedViewUrl(uri);
      } catch {
        return null;
      }
    }
    return uri;
  }, []);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setErr("");
    try {
      const job = await getJobDetailPayload(jobId);
      setJobTitle(String(job.title ?? "Job"));
      setJobType(String(job.jobType ?? "DAILY"));
      setRows(extractApplications(job));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const r of rows) {
        if (!r.photo) continue;
        const u = await resolvePhoto(r.photo);
        if (u && !cancel) next[r.workerId] = u;
      }
      if (!cancel) setPhotos(next);
    })();
    return () => {
      cancel = true;
    };
  }, [rows, resolvePhoto]);

  const filtered = useMemo(() => {
    const wantApproved = tab === "approved";
    return rows.filter((r) => {
      const okApproved = r.status === "approved" || r.status === "shortlisted";
      const okPending = r.status === "pending";
      if (wantApproved) {
        if (!okApproved) return false;
      } else {
        if (!okPending) return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || (r.phone ?? "").includes(q);
    });
  }, [rows, tab, search]);

  async function setStatus(applicationId: string, status: "approved" | "rejected" | "shortlisted") {
    if (!jobId) return;
    setActing(applicationId);
    setErr("");
    try {
      await updateApplicationStatusRequest(jobId, applicationId, status);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActing(null);
    }
  }

  const isMonthly = jobType === "MONTHLY";
  const approveLabel = isMonthly ? "Shortlist" : "Approve";
  const rejectLabel = "Reject";

  if (!jobId) {
    return <p className="p-6 text-sm text-red-600">Invalid job</p>;
  }

  return (
    <div className="min-h-svh bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-3 py-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <Link
            href={"/jobs/" + encodeURIComponent(jobId)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-slate-900">Workers</h1>
            <p className="truncate text-xs text-slate-500">{jobTitle}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={
              "flex-1 rounded-full py-2 text-center text-xs font-semibold " +
              (tab === "pending" ? "bg-[#2563EB] text-white" : "border border-slate-200 bg-white")
            }
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setTab("approved")}
            className={
              "flex-1 rounded-full py-2 text-center text-xs font-semibold " +
              (tab === "approved" ? "bg-[#2563EB] text-white" : "border border-slate-200 bg-white")
            }
          >
            {isMonthly ? "Shortlisted" : "Approved"}
          </button>
        </div>
        <input
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </header>

      {err ? <p className="mx-4 mt-2 text-sm text-red-600">{err}</p> : null}

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            No {tab === "pending" ? "pending" : isMonthly ? "shortlisted" : "approved"} workers.
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => (
              <li key={r.applicationId} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  {photos[r.workerId] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photos[r.workerId]}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{r.name}</p>
                    {r.phone ? <p className="text-sm text-slate-600">{r.phone}</p> : null}
                    {r.phone ? (
                      <a
                        href={"tel:" + r.phone.replace(/\s/g, "")}
                        className="mt-1 inline-block text-xs font-semibold text-[#2563EB]"
                      >
                        Call
                      </a>
                    ) : null}
                  </div>
                </div>
                {tab === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={acting === r.applicationId}
                      onClick={() => void setStatus(r.applicationId, isMonthly ? "shortlisted" : "approved")}
                      className="flex-1 rounded-xl bg-[#2563EB] py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {acting === r.applicationId ? "…" : approveLabel}
                    </button>
                    <button
                      type="button"
                      disabled={acting === r.applicationId}
                      onClick={() => void setStatus(r.applicationId, "rejected")}
                      className="flex-1 rounded-xl border border-red-200 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                    >
                      {rejectLabel}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-medium capitalize text-emerald-700">{r.status}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
