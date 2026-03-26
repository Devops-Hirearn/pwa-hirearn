"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getNotifications } from "@/lib/api/employer";

export default function NotificationsPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setItems(await getNotifications({ limit: 80 }));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-[60vh] bg-slate-50">
      <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-3 py-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link href="/home" className="text-lg text-slate-800">
          ←
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
      </header>
      <main className="px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((n, i) => {
              const title = String(n.title || "Update");
              const message = String(n.message || "");
              const id = String(n.id || n._id || i);
              return (
                <li
                  key={id}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <p className="font-semibold text-slate-900">{title}</p>
                  {message ? <p className="mt-1 text-sm text-slate-600">{message}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
