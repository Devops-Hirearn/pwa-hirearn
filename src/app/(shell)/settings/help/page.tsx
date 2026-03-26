"use client";

import Link from "next/link";

const SUPPORT_EMAIL = "support@hirearn.com";

export default function HelpSupportPage() {
  return (
    <div className="min-h-[50vh] pb-8">
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
            <h1 className="text-base font-bold text-slate-900">Help &amp; Support</h1>
            <p className="text-xs font-medium text-slate-500">We&apos;re here to help</p>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-4 pt-6">
        <div className="hirearn-card rounded-3xl p-5 sm:p-6">
          <p className="text-sm font-semibold text-slate-900">Contact us</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
            Tell us your registered phone number and describe the issue. Screenshots of wallet or job
            screens speed things up.
          </p>
          <a
            href={"mailto:" + SUPPORT_EMAIL + "?subject=Hirearn%20Employer%20Support"}
            className="hirearn-btn-primary mt-4 inline-flex w-full items-center justify-center no-underline"
          >
            Email {SUPPORT_EMAIL}
          </a>
        </div>

        <div className="hirearn-card rounded-3xl p-5 sm:p-6">
          <p className="text-sm font-semibold text-slate-900">Quick answers</p>
          <ul className="mt-3 space-y-4 text-[15px] leading-relaxed text-slate-600">
            <li>
              <span className="font-semibold text-slate-800">Sign-in issues: </span>
              Employer accounts only. Workers should use the Hirearn worker app.
            </li>
            <li>
              <span className="font-semibold text-slate-800">OTP delays: </span>
              Check network, disable SMS filters, and use Resend from the sign-in screen.
            </li>
            <li>
              <span className="font-semibold text-slate-800">KYC: </span>
              Complete verification under Settings → KYC to unlock posting limits where required.
            </li>
          </ul>
        </div>

        <div className="hirearn-card rounded-3xl p-5 sm:p-6">
          <p className="text-sm font-semibold text-slate-900">Legal &amp; product</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href={"/legal/terms?from=/settings/help"} className="text-sm font-semibold text-[#2563EB]">
              Terms of Service →
            </Link>
            <Link href={"/legal/privacy?from=/settings/help"} className="text-sm font-semibold text-[#2563EB]">
              Privacy Policy →
            </Link>
            <Link href="/settings/about" className="text-sm font-semibold text-[#526581]">
              About Hirearn →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
