"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAllWalletTransactions, getWalletBalance } from "@/lib/api/employer";
import type { WalletTransaction } from "@/lib/api/types";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatAmount(amount: number, type: string) {
  const sign = type === "credit" ? "+" : "−";
  return sign + "₹" + amount.toLocaleString("en-IN");
}

function titleFor(t: WalletTransaction) {
  const d = String(t.description || "").toLowerCase();
  if (d.includes("topup") || d.includes("top up")) return "Wallet Top Up";
  if (t.jobId || t.jobTitle) return "Job Payment";
  return t.description || t.jobTitle || "Transaction";
}

function subtitleFor(t: WalletTransaction) {
  const parts = [t.description, t.jobTitle].filter(Boolean);
  return parts[0] || "Transaction";
}

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [bal, tx] = await Promise.all([getWalletBalance(), getAllWalletTransactions()]);
      setBalance(bal.balance || 0);
      setTransactions(tx);
    } catch {
      setBalance(0);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-[60vh] bg-slate-50">
      <header className="border-b border-slate-100 bg-white px-4 py-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-center text-xl font-bold text-slate-900">Wallet</h1>
      </header>

      <main className="space-y-4 px-4 py-4">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          {loading && transactions.length === 0 ? (
            <div className="flex justify-center py-6">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
            </div>
          ) : (
            <>
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                ₹
                {balance.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="mt-1 text-sm text-slate-500">Current balance</p>
              <Link
                href="/wallet/add"
                className="mt-5 inline-flex w-full justify-center rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white"
              >
                Add money
              </Link>
            </>
          )}
        </section>

        <h2 className="px-1 text-base font-semibold text-slate-900">Recent transactions</h2>

        {transactions.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
            No transactions yet
          </div>
        ) : (
          <ul className="space-y-3">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                  <BriefcaseIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{titleFor(t)}</p>
                  <p className="text-xs text-slate-500">{subtitleFor(t)}</p>
                  <p className="text-xs text-slate-400">{t.createdAt ? formatDate(t.createdAt) : ""}</p>
                </div>
                <p
                  className={
                    "shrink-0 text-sm font-semibold " +
                    (t.type === "credit" ? "text-emerald-600" : "text-red-600")
                  }
                >
                  {formatAmount(t.amount, t.type)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="px-1 pb-6 text-center text-xs text-slate-500">
          Once attendance is verified, payments follow your job rules from the backend.
        </p>
      </main>
    </div>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}
