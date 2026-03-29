"use client";

import { HirearnMark } from "@/components/brand/HirearnMark";
import { useAuth } from "@/contexts/auth-context";
import { clearStoredToken, getCurrentUser, sendOtp, verifyOtp } from "@/lib/api/client";
import { getEmployerOnboardingPath } from "@/lib/auth/employerGating";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const RESEND_SECONDS = 60;

function formatPhoneDisplay(digits: string) {
  if (digits.length <= 5) return digits;
  return digits.slice(0, 5) + " " + digits.slice(5);
}

function roleFromPayload(user: Record<string, unknown> | undefined): string | null {
  if (!user || typeof user !== "object") return null;
  const r = user.role;
  if (r === "worker" || r === "employer") return r;
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, refreshUser, logout } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    if (user?.isAdmin) {
      router.replace("/home");
      return;
    }
    if (user?.role === "employer") {
      const gate = getEmployerOnboardingPath(user);
      router.replace(gate ?? "/home");
    }
  }, [ready, user, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === "otp") {
      otpInputRef.current?.focus();
    } else {
      phoneInputRef.current?.focus();
    }
  }, [step]);

  const digitsValid = MOBILE_REGEX.test(phoneDigits);

  const startResendCooldown = useCallback(() => setResendIn(RESEND_SECONDS), []);

  async function onSendOtp() {
    setError("");
    if (!digitsValid) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!terms || !privacy) {
      setError("Please accept Terms and Privacy Policy to continue");
      return;
    }
    setLoading(true);
    try {
      await sendOtp(phoneDigits);
      setStep("otp");
      setOtp("");
      startResendCooldown();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function onResendOtp() {
    if (resendIn > 0 || loading || !digitsValid) return;
    setError("");
    setLoading(true);
    try {
      await sendOtp(phoneDigits);
      setOtp("");
      startResendCooldown();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend OTP");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    setError("");
    if (otp.replace(/\D/g, "").length < 4) {
      setError("Enter the OTP from your SMS");
      return;
    }
    setLoading(true);
    try {
      const data = await verifyOtp(phoneDigits, otp, "employer", terms, privacy);
      const r = roleFromPayload(data.user);
      if (r === "worker") {
        clearStoredToken();
        await refreshUser();
        setError(
          "This experience is for employers. This number is registered as a worker on Hirearn. Please use the worker app.",
        );
        setStep("phone");
        setOtp("");
        return;
      }
      await refreshUser();
      const me = await getCurrentUser();
      router.replace(getEmployerOnboardingPath(me) ?? "/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 hirearn-mesh">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Preparing sign-in…</p>
      </div>
    );
  }

  const workerOnSession = user?.role === "worker";

  return (
    <div className="min-h-svh hirearn-mesh px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="flex flex-col items-center pt-2">
          <div className="flex flex-col items-center">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/[0.05]">
              <Image src="/icon-192.png" alt="Hirearn" fill className="object-cover" priority />
            </div>
            <div className="mt-4">
              <HirearnMark className="justify-center" />
            </div>
          </div>
          <p className="mt-4 text-center text-[15px] font-medium text-slate-600">
            Sign in with your mobile number. We&apos;ll send a one-time code by SMS.
          </p>
        </div>

        <div className="mt-8 hirearn-card rounded-3xl p-6 sm:p-7">
          <div className="mb-6 flex justify-center gap-3">
            <StepDot index={1} done={step === "otp"} active={step === "phone"} label="Phone" />
            <span className="self-center text-slate-200">→</span>
            <StepDot index={2} done={false} active={step === "otp"} label="Code" />
          </div>

          {workerOnSession ? (
            <div className="mb-5 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">Employer access only</p>
              <p className="mt-1 text-amber-900/85">
                You&apos;re signed in as a worker. Sign out to use an employer account on this app.
              </p>
              <button
                type="button"
                className="hirearn-btn-primary mt-3 w-full !bg-amber-700 !shadow-amber-600/25 text-[14px]"
                onClick={() => {
                  logout();
                  setError("");
                }}
              >
                Sign out
              </button>
            </div>
          ) : null}

          {step === "phone" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Mobile number
                </label>
                <div className="flex rounded-2xl border border-slate-200/90 bg-white shadow-[var(--hirearn-shadow-sm)] focus-within:border-[rgba(37,99,235,0.45)] focus-within:shadow-[0_0_0_4px_var(--hirearn-ring),var(--hirearn-shadow-sm)]">
                  <span className="flex items-center border-r border-slate-100 pl-4 pr-2 text-sm font-semibold text-slate-500">
                    +91
                  </span>
                  <input
                    ref={phoneInputRef}
                    inputMode="numeric"
                    autoComplete="tel"
                    // We render a space after 5 digits (e.g. 98765 43210),
                    // so maxLength must allow 11 characters; we still enforce 10 digits in state.
                    maxLength={11}
                    className="min-w-0 flex-1 rounded-2xl bg-transparent py-3.5 pr-4 pl-2 text-lg font-medium tracking-wide text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="98765 43210"
                    value={formatPhoneDisplay(phoneDigits)}
                    onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-0 py-1 transition hover:border-slate-100">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span className="text-[14px] leading-snug text-slate-600">
                    I agree to the{" "}
                    <Link href="/legal/terms" className="font-semibold text-[#2563EB] underline decoration-blue-200 underline-offset-2">
                      Terms of Service
                    </Link>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-0 py-1 transition hover:border-slate-100">
                  <input
                    type="checkbox"
                    checked={privacy}
                    onChange={(e) => setPrivacy(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span className="text-[14px] leading-snug text-slate-600">
                    I agree to the{" "}
                    <Link href="/legal/privacy" className="font-semibold text-[#2563EB] underline decoration-blue-200 underline-offset-2">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
              ) : null}

              <button type="button" disabled={loading} onClick={onSendOtp} className="hirearn-btn-primary w-full">
                {loading ? "Sending code…" : "Continue"}
              </button>

              <p className="text-center text-xs text-slate-500">
                Secured with OTP · For employer accounts only
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm text-slate-600">
                Enter the code sent to{" "}
                <span className="font-semibold text-slate-900">+91 {formatPhoneDisplay(phoneDigits)}</span>
              </p>
              <input
                ref={otpInputRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                className="hirearn-input text-center text-2xl font-semibold tracking-[0.35em] placeholder:tracking-normal"
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />

              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
              ) : null}

              <button type="button" disabled={loading} onClick={onVerify} className="hirearn-btn-primary w-full">
                {loading ? "Verifying…" : "Verify & sign in"}
              </button>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  disabled={resendIn > 0 || loading}
                  onClick={onResendOtp}
                  className="text-center text-sm font-semibold text-[#2563EB] disabled:text-slate-400"
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  className="text-center text-sm font-medium text-slate-500"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setError("");
                    setResendIn(0);
                  }}
                >
                  Edit phone number
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
          <Link href="/legal/terms" className="hover:text-[#2563EB]">
            Terms
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/legal/privacy" className="hover:text-[#2563EB]">
            Privacy
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/help" className="hover:text-[#2563EB]">
            Help
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/about" className="hover:text-[#2563EB]">
            About
          </Link>
        </nav>
      </div>
    </div>
  );
}

function StepDot({
  index,
  done,
  active,
  label,
}: {
  index: number;
  done: boolean;
  active: boolean;
  label: string;
}) {
  const on = done || active;
  return (
    <div className={"flex flex-col items-center gap-1.5 " + (on ? "text-[#2563EB]" : "text-slate-400")}>
      <span
        className={
          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all " +
          (done
            ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/25"
            : active
              ? "bg-blue-100 text-[#2563EB] ring-2 ring-[#2563EB]/30"
              : "bg-slate-100 text-slate-500")
        }
      >
        {done ? "✓" : index}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
    </div>
  );
}
