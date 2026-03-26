"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getConversations } from "@/lib/api/employer";
import type { Conversation } from "@/lib/api/types";

function formatTimestamp(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function MessagesPage() {
  const [search, setSearch] = useState("");
  const [list, setList] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConv = useCallback(async () => {
    try {
      const raw = await getConversations();
      setList(Array.isArray(raw) ? raw : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConv();
    const t = setInterval(fetchConv, 8000);
    return () => clearInterval(t);
  }, [fetchConv]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return list.filter((conv) => {
      if (!conv?.user) return false;
      const name = (conv.user.fullName || conv.user.phoneNumber || "").toLowerCase();
      return !q || name.includes(q);
    });
  }, [list, search]);

  return (
    <div className="flex min-h-[60vh] flex-col bg-slate-50">
      <header className="border-b border-slate-100 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Messages</h1>
          <button
            type="button"
            className="rounded-full p-2 text-slate-600 hover:bg-slate-50"
            aria-label="New message"
            disabled
          >
            <EditIcon />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Search by name or job"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <main className="flex-1 px-4 py-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <ChatOutlineIcon className="h-9 w-9" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">No conversations yet</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-600">
              When workers message you about jobs, threads will appear here—same as in the mobile
              app.
            </p>
            <Link
              href="/jobs"
              className="mt-6 text-sm font-semibold text-[#2563EB]"
            >
              View your jobs
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            {filtered.map((conv) => {
              const uid = String(conv.user.id || conv.user._id || "");
              const name = conv.user.fullName || conv.user.phoneNumber || "Unknown";
              const last = conv.lastMessage;
              const preview = last?.content || "No messages yet";
              const ts = last?.createdAt ? formatTimestamp(last.createdAt) : "";
              const unread = conv.unreadCount || 0;
              return (
                <li key={uid}>
                  <Link
                    href={"/messages/" + encodeURIComponent(uid)}
                    className="flex gap-3 p-4 transition hover:bg-slate-50"
                  >
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10 text-base font-semibold text-[#2563EB]">
                      {name.charAt(0).toUpperCase()}
                      {unread > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold text-slate-900">{name}</span>
                        {ts ? (
                          <span className="shrink-0 text-xs text-slate-500">{ts}</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{preview}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ChatOutlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}
