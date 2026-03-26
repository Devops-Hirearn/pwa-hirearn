import Link from "next/link";

const SUPPORT_EMAIL = "support@hirearn.com";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div className="hirearn-card rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Help &amp; Support</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          We&apos;re here for employers using Hirearn on the web. Choose a channel below — most requests are
          answered within one business day.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={"mailto:" + SUPPORT_EMAIL + "?subject=Hirearn%20Employer%20Support"}
            className="hirearn-btn-primary flex flex-1 items-center justify-center gap-2 text-center no-underline"
          >
            Email support
          </a>
          <Link
            href="/login"
            className="flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white py-3.5 text-[15px] font-semibold text-slate-800 shadow-[var(--hirearn-shadow-sm)] transition hover:border-slate-300"
          >
            Back to sign in
          </Link>
        </div>
      </div>

      <div className="hirearn-card rounded-3xl p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Common questions</h2>
        <dl className="mt-4 space-y-5">
          <div>
            <dt className="font-semibold text-slate-800">I can&apos;t sign in with my number</dt>
            <dd className="mt-1 text-[15px] leading-relaxed text-slate-600">
              Make sure you&apos;re using the employer portal. If your number is registered as a worker,
              you&apos;ll need the worker app or a separate employer account.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-800">OTP not arriving</dt>
            <dd className="mt-1 text-[15px] leading-relaxed text-slate-600">
              Check signal and SMS filters. Wait a minute, tap Resend, or try editing your number for typos.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-800">Wallet or payout issue</dt>
            <dd className="mt-1 text-[15px] leading-relaxed text-slate-600">
              Include your registered phone number, job ID if relevant, and a screenshot of the wallet
              screen when you email us — it helps us resolve faster.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
