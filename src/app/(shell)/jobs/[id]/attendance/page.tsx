"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type TodayAttendanceCardItem,
  apiOriginForUploads,
  employerManualCheckout,
  fetchAttendanceList,
  generateCheckoutCode,
  getJobDetailPayload,
  getJobQrCode,
  getTodayAttendanceCard,
  replaceWorkerRequest,
} from "@/lib/api/jobAttendance";
import {
  type EmployerAttendanceRecord,
  canReplaceWorkerForJob,
  mergeTodayJobDayCodes,
  normalizeEmployerAttendanceItem,
} from "@/lib/attendance/employerNormalize";
import { getPresignedViewUrl } from "@/lib/uploads/presignView";

function isImageSrc(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:");
}

function QrBlock({ src, caption }: { src: string | null; caption: string }) {
  if (!src) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-slate-500">
        <p className="text-sm">QR code not available</p>
      </div>
    );
  }
  if (!isImageSrc(src)) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50/60 py-6 text-center text-sm text-amber-900">
        Invalid QR format
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-[180px] w-[180px] object-contain" />
      <p className="mt-2 text-center text-xs text-slate-500">{caption}</p>
    </div>
  );
}

function getCheckoutMethodLabel(method?: string) {
  switch (method) {
    case "QR_CODE":
      return "QR Code";
    case "MANUAL_CODE":
      return "Manual Code";
    case "EMPLOYER_MANUAL":
      return "Manual";
    case "SYSTEM_AUTO":
      return "Auto";
    default:
      return "";
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      /* ignore */
    }
  }
}

export default function EmployerAttendancePage() {
  const params = useParams();
  const jobId = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [jobPayload, setJobPayload] = useState<Record<string, unknown> | null>(null);
  const [attendance, setAttendance] = useState<EmployerAttendanceRecord[]>([]);
  const [workerPhotos, setWorkerPhotos] = useState<Record<string, string>>({});

  const [copying, setCopying] = useState(false);
  const [generatingCheckout, setGeneratingCheckout] = useState(false);
  const [manualCheckoutLoading, setManualCheckoutLoading] = useState<string | null>(null);
  const [replacingWorker, setReplacingWorker] = useState<string | null>(null);

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardData, setCardData] = useState<TodayAttendanceCardItem[]>([]);

  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<EmployerAttendanceRecord | null>(null);
  const [replaceReason, setReplaceReason] = useState("Did not check in on time");

  const fetchAll = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!jobId) return;
      if (!opts?.silent) setLoading(true);
      setErr("");
      try {
        const jobRaw = await getJobDetailPayload(jobId);
        const merged: Record<string, unknown> = { ...jobRaw };
        mergeTodayJobDayCodes(merged);

        if (!merged.qrCode || !merged.checkInCode) {
          try {
            const qrData = await getJobQrCode(jobId);
            if (qrData.qrCode) merged.qrCode = qrData.qrCode;
            if (qrData.checkInCode) merged.checkInCode = qrData.checkInCode;
            if (qrData.checkoutQRCode) merged.checkoutQRCode = qrData.checkoutQRCode;
            if (qrData.checkoutCode) merged.checkoutCode = qrData.checkoutCode;
          } catch {
            /* optional */
          }
        }

        setJobPayload(merged);

        let list = await fetchAttendanceList(jobId);
        if (list.length === 0 && Array.isArray(merged.attendance)) {
          list = merged.attendance as unknown[];
        }
        setAttendance(list.map(normalizeEmployerAttendanceItem));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load attendance");
        setJobPayload(null);
        setAttendance([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [jobId],
  );

  useEffect(() => {
    if (!jobId) return;
    fetchAll();
  }, [jobId, fetchAll]);

  const resolvePhoto = useCallback(
    async (uri: string | null | undefined): Promise<string | null> => {
      if (!uri) return null;
      const origin = apiOriginForUploads();
      if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
        return `${origin}${uri.startsWith("/") ? uri : `/${uri}`}`;
      }
      if (uri.includes(".s3.")) {
        try {
          return await getPresignedViewUrl(uri);
        } catch {
          return null;
        }
      }
      return uri;
    },
    [],
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        attendance.map(async (r) => {
          if (!r.profilePhotoUrl) return;
          const url = await resolvePhoto(r.profilePhotoUrl);
          if (url && !cancel) next[r.id] = url;
        }),
      );
      if (!cancel) setWorkerPhotos(next);
    })();
    return () => {
      cancel = true;
    };
  }, [attendance, resolvePhoto]);

  const qrString = jobPayload?.qrCode != null ? String(jobPayload.qrCode) : null;
  const checkInCode = jobPayload?.checkInCode != null ? String(jobPayload.checkInCode) : "";
  const checkoutQRString = jobPayload?.checkoutQRCode != null ? String(jobPayload.checkoutQRCode) : null;
  const checkoutCode = jobPayload?.checkoutCode != null ? String(jobPayload.checkoutCode) : "";

  const openTodayCard = async () => {
    if (!jobId) return;
    setShowCardModal(true);
    setCardLoading(true);
    try {
      const res = await getTodayAttendanceCard(jobId);
      setCardData(Array.isArray(res.attendanceCards) ? res.attendanceCards : []);
    } catch {
      setCardData([]);
    } finally {
      setCardLoading(false);
    }
  };

  const onGenerateCheckout = async () => {
    if (!jobId) return;
    setGeneratingCheckout(true);
    try {
      const result = await generateCheckoutCode(jobId);
      setJobPayload((prev) =>
        prev
          ? {
              ...prev,
              checkoutCode: result.checkoutCode,
              checkoutQRCode: result.checkoutQRCode,
              checkoutCodeExpiresAt: result.expiresAt,
            }
          : prev,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate checkout code");
    } finally {
      setGeneratingCheckout(false);
    }
  };

  const onManualCheckout = async (workerId: string) => {
    if (!jobId || !workerId) return;
    setManualCheckoutLoading(workerId);
    try {
      const result = await employerManualCheckout(jobId, [workerId]);
      if (result.errors && result.errors.length > 0) {
        alert(result.errors[0]);
      } else {
        await fetchAll({ silent: true });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setManualCheckoutLoading(null);
    }
  };

  const onConfirmReplace = async () => {
    if (!jobId || !pendingReplace?.workerId || !replaceReason.trim()) {
      alert("Reason is required");
      return;
    }
    const info = canReplaceWorkerForJob(jobPayload, pendingReplace);
    if (!info.canReplace || !info.jobDayId) {
      alert(info.reason || "Cannot replace worker");
      setShowReplaceModal(false);
      setPendingReplace(null);
      return;
    }
    setReplacingWorker(pendingReplace.workerId);
    try {
      const result = await replaceWorkerRequest(
        jobId,
        info.jobDayId,
        pendingReplace.workerId,
        replaceReason.trim(),
      );
      if (result.replacementSuccess !== false && result.success !== false) {
        await fetchAll({ silent: true });
        setShowReplaceModal(false);
        setPendingReplace(null);
        setReplaceReason("Did not check in on time");
      } else {
        alert(result.message || "Failed to replace worker");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to replace worker");
    } finally {
      setReplacingWorker(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll({ silent: true });
  };

  const jobDataForReplace = useMemo(() => jobPayload, [jobPayload]);

  if (!jobId) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Invalid job</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-slate-50 pb-28">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-0">
        <Link
          href={"/jobs/" + encodeURIComponent(jobId)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700"
          aria-label="Back"
        >
          ←
        </Link>
        <h1 className="min-w-0 flex-1 text-center text-lg font-bold text-slate-900">Attendance</h1>
        <button
          type="button"
          onClick={openTodayCard}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#2563EB]"
          aria-label="Today's attendance card"
        >
          Card
        </button>
      </header>

      {err ? (
        <div className="mx-4 mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </div>
      ) : null}

      <div className="space-y-4 px-4 py-4 sm:px-0">
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Check-In QR Code</h2>
          <div className="mt-3 flex justify-center">
            <QrBlock src={qrString} caption="Workers must scan this QR to check in for the job." />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Manual Check-In Code</h2>
          <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="font-mono text-3xl font-bold tracking-wider text-slate-900">{checkInCode || "—"}</p>
            <button
              type="button"
              disabled={!checkInCode || copying}
              onClick={async () => {
                if (!checkInCode) return;
                setCopying(true);
                await copyText(checkInCode);
                setCopying(false);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
            >
              {copying ? "…" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">Use this code if the QR does not work.</p>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Checkout QR Code &amp; Manual Code</h2>
          {!checkoutCode ? (
            <div className="mt-4">
              <button
                type="button"
                disabled={generatingCheckout}
                onClick={onGenerateCheckout}
                className="w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {generatingCheckout ? "Generating…" : "Generate Checkout Code"}
              </button>
              <p className="mt-2 text-sm text-slate-500">
                Generate a checkout code to allow workers to checkout from the job.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {checkoutQRString ? (
                <div>
                  <p className="text-sm font-semibold text-slate-800">Checkout QR Code</p>
                  <div className="mt-2 flex justify-center">
                    <QrBlock src={checkoutQRString} caption="" />
                  </div>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-semibold text-slate-800">Manual Checkout Code</p>
                <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                  <p className="font-mono text-3xl font-bold tracking-wider text-slate-900">{checkoutCode}</p>
                  <button
                    type="button"
                    disabled={copying}
                    onClick={async () => {
                      setCopying(true);
                      await copyText(checkoutCode);
                      setCopying(false);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800"
                  >
                    {copying ? "…" : "Copy"}
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-500">Workers can scan QR or enter this code to checkout.</p>
              </div>
            </div>
          )}
        </section>

        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-base font-semibold text-slate-900">Today&apos;s Attendance</h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="text-xs font-medium text-[#2563EB] disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {attendance.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">No workers assigned</p>
            <p className="mt-1 text-xs text-slate-500">
              There are no attendance records for this job yet.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {attendance.map((item, i) => (
              <li
                key={item.workerId ? item.workerId + "-" + i : item.id + "-" + i}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    {workerPhotos[item.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={workerPhotos[item.id]}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600">
                        {item.name ? item.name.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      {item.phoneNumber ? (
                        <p className="text-sm text-slate-600">{item.phoneNumber}</p>
                      ) : null}
                      <p className="text-xs text-slate-500">
                        {item.age ? `${item.age} yrs` : ""}
                        {item.age && item.gender ? " • " : ""}
                        {item.gender || (!item.age ? "Details not available" : "")}
                      </p>
                      {item.phoneNumber ? (
                        <a
                          href={"tel:" + item.phoneNumber.replace(/\s/g, "")}
                          className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                        >
                          Call
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    {item.status === "checkedIn" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                          Checked In
                        </span>
                        {item.workerId ? (
                          <button
                            type="button"
                            disabled={manualCheckoutLoading === item.workerId}
                            onClick={() => onManualCheckout(item.workerId!)}
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-800"
                          >
                            {manualCheckoutLoading === item.workerId ? "…" : "Check Out"}
                          </button>
                        ) : null}
                      </div>
                    ) : item.status === "checkedOut" ? (
                      <div className="text-right">
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                          Checked Out
                        </span>
                        {item.checkoutMethod ? (
                          <p className="mt-1 text-xs text-slate-500">
                            ({getCheckoutMethodLabel(item.checkoutMethod)})
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          Not Checked In
                        </span>
                        {(() => {
                          const info = canReplaceWorkerForJob(jobDataForReplace, item);
                          if (info.canReplace && item.workerId) {
                            return (
                              <button
                                type="button"
                                disabled={replacingWorker === item.workerId}
                                onClick={() => {
                                  setPendingReplace(item);
                                  setReplaceReason("Did not check in on time");
                                  setShowReplaceModal(true);
                                }}
                                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900"
                              >
                                {replacingWorker === item.workerId ? "Replacing…" : "Replace"}
                              </button>
                            );
                          }
                          if (info.reason) {
                            return (
                              <p className="max-w-[220px] text-right text-[11px] text-slate-500">{info.reason}</p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-xs text-slate-500">Check In</dt>
                    <dd className="text-right text-slate-800">{item.checkInDateTime || "Not checked in"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-xs text-slate-500">Check Out</dt>
                    <dd className="text-right text-slate-800">{item.checkOutDateTime || "Not checked out"}</dd>
                  </div>
                  {item.checkoutMethod && item.status === "checkedOut" ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-xs text-slate-500">Checkout Method</dt>
                      <dd className="text-right text-slate-800">
                        {getCheckoutMethodLabel(item.checkoutMethod)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showCardModal ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-lg font-bold text-slate-900">Today&apos;s Attendance Card</h2>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {cardLoading ? (
                <div className="flex justify-center py-16">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
                </div>
              ) : cardData.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No attendance data available</p>
              ) : (
                <ul className="space-y-3">
                  {cardData.map((c, i) => (
                    <li key={c.workerName + i} className="rounded-xl border border-slate-100 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900">{c.workerName}</p>
                        <span
                          className={
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                            (c.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : c.status === "In Progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700")
                          }
                        >
                          {c.status}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Check-In</span>
                          <span className="font-medium text-slate-800">{c.checkInTime || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Check-Out</span>
                          <span className="font-medium text-slate-800">{c.checkOutTime || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Work time</span>
                          <span className="font-medium text-slate-800">
                            {c.totalWorkTime
                              ? `${Math.floor(c.totalWorkTime / 60)}h ${c.totalWorkTime % 60}m`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Payable</span>
                          <span className="font-semibold text-[#2563EB]">
                            ₹{Number(c.payableAmount).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {(c.lateCheckIn || c.earlyCheckout) && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {c.lateCheckIn ? (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
                                Late check-in
                              </span>
                            ) : null}
                            {c.earlyCheckout ? (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
                                Early checkout
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showReplaceModal && pendingReplace ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Replace Worker</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={4}
              value={replaceReason}
              onChange={(e) => setReplaceReason(e.target.value)}
              placeholder="e.g. Did not check in on time"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowReplaceModal(false);
                  setPendingReplace(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!replaceReason.trim() || !!replacingWorker}
                onClick={onConfirmReplace}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {replacingWorker ? "…" : "Replace"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
