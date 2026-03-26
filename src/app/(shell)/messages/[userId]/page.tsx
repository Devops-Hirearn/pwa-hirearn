"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, getCurrentUser } from "@/lib/api/client";
import type { AppUser } from "@/lib/api/types";

type Msg = {
  id?: string;
  _id?: string;
  sender?: string;
  content?: string;
  createdAt?: string;
  read?: boolean;
};

export default function ChatThreadPage() {
  const params = useParams();
  const otherId = typeof params.userId === "string" ? params.userId : "";
  const [me, setMe] = useState<AppUser | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(async () => {
    if (!otherId) return;
    try {
      const res = await apiRequest<{ messages?: Msg[] }>(
        "/messages/conversation/" + encodeURIComponent(otherId) + "?limit=80",
      );
      const arr = Array.isArray(res.messages) ? res.messages : [];
      setMessages(arr);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [otherId]);

  useEffect(() => {
    getCurrentUser().then(setMe);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadThread();
    const t = setInterval(loadThread, 6000);
    return () => clearInterval(t);
  }, [loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const v = text.trim();
    if (!v || !otherId) return;
    setSending(true);
    try {
      await apiRequest("/messages", {
        method: "POST",
        body: JSON.stringify({ receiver: otherId, content: v, type: "text" }),
      });
      setText("");
      await loadThread();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col bg-slate-100">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <Link
          href="/messages"
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-slate-700"
        >
          ←
        </Link>
        <h1 className="text-base font-semibold text-slate-900">Chat</h1>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No messages yet. Say hi below.</p>
        ) : (
          messages.map((m) => {
            const mid = String(m.id || m._id || Math.random());
            const mine = me?.id && m.sender === me.id;
            return (
              <div key={mid} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm " +
                    (mine ? "bg-[#2563EB] text-white" : "border border-slate-200 bg-white text-slate-900")
                  }
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          />
          <button
            type="button"
            disabled={sending || !text.trim()}
            onClick={send}
            className="shrink-0 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
