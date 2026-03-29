"use client";

import Link from "next/link";
import { FormSectionCard, formFieldLabelClass, formInputClass } from "@/components/employer/FormSectionCard";
import { fetchUserProfileRecord, updateBankAccountApi } from "@/lib/api/user";
import { useCallback, useEffect, useState } from "react";

type BankForm = {
  accountHolderName: string;
  accountNumber: string;
  reEnterAccountNumber: string;
  ifscCode: string;
  bankName: string;
};

function parseBank(raw: unknown): Partial<BankForm> | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const num = b.accountNumber ?? b.account_number;
  if (num == null || String(num).trim() === "") return null;
  return {
    accountHolderName: String(b.accountHolderName ?? b.account_holder_name ?? ""),
    accountNumber: String(num),
    reEnterAccountNumber: String(num),
    ifscCode: String(b.ifscCode ?? b.ifsc_code ?? "").toUpperCase(),
    bankName: String(b.bankName ?? b.bank_name ?? ""),
  };
}

export default function EmployerBankPage() {
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [form, setForm] = useState<BankForm>({
    accountHolderName: "",
    accountNumber: "",
    reEnterAccountNumber: "",
    ifscCode: "",
    bankName: "",
  });

  const load = useCallback(async () => {
    setError("");
    try {
      setFetching(true);
      const user = await fetchUserProfileRecord();
      const b = parseBank(user.bankAccount ?? user.bank_account);
      if (b?.accountNumber) {
        setHasSaved(true);
        setShowForm(false);
        setForm({
          accountHolderName: b.accountHolderName ?? "",
          accountNumber: b.accountNumber,
          reEnterAccountNumber: b.accountNumber,
          ifscCode: (b.ifscCode ?? "").toUpperCase(),
          bankName: b.bankName ?? "",
        });
      } else {
        setHasSaved(false);
        setShowForm(true);
      }
    } catch {
      setError("Could not load bank details.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.accountNumber !== form.reEnterAccountNumber) {
      setError("Account numbers do not match.");
      return;
    }
    if (!form.accountHolderName.trim() || !form.accountNumber.trim() || !form.ifscCode.trim()) {
      setError("Account holder name, account number, and IFSC are required.");
      return;
    }
    if (form.ifscCode.trim().length !== 11) {
      setError("IFSC must be 11 characters.");
      return;
    }
    try {
      setLoading(true);
      await updateBankAccountApi({
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
        bankName: form.bankName.trim() || "Unknown",
      });
      setSuccess("Bank account saved.");
      setHasSaved(true);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] bg-slate-50 pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm transition active:scale-95"
            aria-label="Back to settings"
          >
            ←
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900">Bank account</h1>
            <p className="text-xs font-medium text-slate-500">Payout &amp; refunds</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-6">
        {fetching ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          </div>
        ) : (
          <>
            {success ? (
              <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                {success}
              </p>
            ) : null}
            {error ? (
              <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {error}
              </p>
            ) : null}

            {hasSaved && !showForm ? (
              <FormSectionCard title="Saved account" subtitle="Used for employer payouts where applicable.">
                <p className="text-sm font-semibold text-slate-900">{form.accountHolderName}</p>
                <p className="mt-1 font-mono text-sm text-slate-600">
                  ****{form.accountNumber.replace(/\s/g, "").slice(-4)} · {form.bankName || "—"}
                </p>
                <p className="mt-1 text-sm text-slate-600">IFSC: {form.ifscCode}</p>
                <button
                  type="button"
                  className="hirearn-btn-primary mt-4 w-full min-h-[48px] !bg-white !text-[#2563EB] ring-1 ring-slate-200"
                  onClick={() => {
                    setShowForm(true);
                    setSuccess("");
                  }}
                >
                  Update account
                </button>
              </FormSectionCard>
            ) : null}

            {showForm ? (
              <form onSubmit={onSave} className="space-y-6">
                <FormSectionCard
                  title={hasSaved ? "Update bank details" : "Add bank account"}
                  subtitle="Enter details exactly as per bank records."
                >
                  <div>
                    <label className={formFieldLabelClass} htmlFor="bk-name">
                      Account holder name
                    </label>
                    <input
                      id="bk-name"
                      className={formInputClass}
                      autoComplete="name"
                      value={form.accountHolderName}
                      onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className={formFieldLabelClass} htmlFor="bk-ac">
                      Account number
                    </label>
                    <input
                      id="bk-ac"
                      className={formInputClass}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={18}
                      value={form.accountNumber}
                      onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\s/g, "") })}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className={formFieldLabelClass} htmlFor="bk-ac2">
                      Re-enter account number
                    </label>
                    <input
                      id="bk-ac2"
                      className={formInputClass}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={18}
                      value={form.reEnterAccountNumber}
                      onChange={(e) =>
                        setForm({ ...form, reEnterAccountNumber: e.target.value.replace(/\s/g, "") })
                      }
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className={formFieldLabelClass} htmlFor="bk-ifsc">
                      IFSC code
                    </label>
                    <input
                      id="bk-ifsc"
                      className={formInputClass}
                      autoComplete="off"
                      maxLength={11}
                      value={form.ifscCode}
                      onChange={(e) =>
                        setForm({ ...form, ifscCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
                      }
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className={formFieldLabelClass} htmlFor="bk-bank">
                      Bank name
                    </label>
                    <input
                      id="bk-bank"
                      className={formInputClass}
                      placeholder="e.g. State Bank of India"
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </FormSectionCard>
                <button type="submit" disabled={loading} className="hirearn-btn-primary min-h-[48px] w-full">
                  {loading ? "Saving…" : hasSaved ? "Update bank account" : "Save bank account"}
                </button>
                {hasSaved ? (
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700"
                    onClick={() => {
                      setShowForm(false);
                      setError("");
                      void load();
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </form>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
