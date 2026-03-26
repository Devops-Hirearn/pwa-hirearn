"use client";

import { useCallback, useEffect, useState } from "react";
import { getJobBroadcasts, sendJobBroadcast, type JobBroadcast } from "@/lib/api/jobActions";
import { formatISTDateTimeAttendance } from "@/lib/time/attendanceDisplay";

const MAX_LEN = 2000;

type Props = {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle?: string;
};

export function JobBroadcastsModal({ open, onClose, jobId, jobTitle }: Props) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState<JobBroadcast[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getJobBroadcasts(jobId, 50);
      setItems(Array.isArray(res.broadcasts) ? res.broadcasts : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load updates");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (open) {
      load();
      setDraft("");
    }
  }, [open, load]);

  if (!open) return null;

  async function onSend() {
    const text = draft.trim();
    if (!text) {
      setError("Please enter a message for your team.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await sendJobBroadcast(jobId, text);
      const n = res.stats?.notified ?? 0;
      const skipped = res.stats?.skipped ?? 0;
      alert(
        skipped > 0
          ? `Delivered to ${n} worker(s). ${skipped} may have notifications off.`
          : `Delivered to ${n} worker(s).`,
      );
      setDraft("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Team updates</h2>
            {jobTitle ? <p className="text-xs text-slate-500">{jobTitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No broadcasts yet.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const id = item.id || item._id || item.createdAt || Math.random().toString();
                const when = item.createdAt ? formatISTDateTimeAttendance(item.createdAt) : "";
                const meta =
                  item.notifiedCount != null && item.recipientCount != null
                    ? `${item.notifiedCount}/${item.recipientCount} notified`
                    : "";
                return (
                  <li key={id} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-[11px] text-slate-500">
                      {when}
                      {meta ? ` · ${meta}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-800">{item.body}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            maxLength={MAX_LEN}
            placeholder="Message all approved workers…"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          />
          <div className="mt-2 flex justify-between gap-2">
            <span className="text-[11px] text-slate-400">{draft.length}/{MAX_LEN}</span>
            <button
              type="button"
              disabled={sending || !draft.trim()}
              onClick={() => void onSend()}
              className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
