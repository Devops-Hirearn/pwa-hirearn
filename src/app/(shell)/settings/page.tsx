"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

const FROM = "?from=/settings";

const accountItems = [
  {
    href: "/settings/kyc",
    title: "KYC & Verification",
    subtitle: "Aadhaar, selfie & identity verification",
    icon: "shield",
  },
  {
    href: "/settings/bank",
    title: "Bank Account for Payouts",
    subtitle: "Add or update your payout bank account",
    icon: "bank",
  },
] as const;

const generalItems = [
  {
    href: "/settings/notifications",
    title: "Notifications",
    subtitle: "Job alerts, payment updates",
    icon: "bell",
  },
  {
    href: "/settings/help",
    title: "Help & Support",
    subtitle: "FAQs, email, and guidance",
    icon: "help",
  },
  {
    href: "/legal/terms" + FROM,
    title: "Terms of Service",
    subtitle: "How you may use Hirearn",
    icon: "doc",
  },
  {
    href: "/legal/privacy" + FROM,
    title: "Privacy Policy",
    subtitle: "How we handle your data",
    icon: "lock",
  },
  {
    href: "/settings/about",
    title: "About Hirearn",
    subtitle: "Product story & version",
    icon: "info",
  },
] as const;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const name = (user?.fullName as string) || (user?.name as string) || "User";
  const phone = (user?.phoneNumber as string) || "—";
  const initials =
    name
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <div className="min-h-[60vh] pb-8">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl backdrop-saturate-150 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-center text-lg font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-0.5 text-center text-xs font-medium text-slate-500">Account &amp; preferences</p>
      </header>

      <div className="px-4 pt-6">
        <div className="hirearn-card flex flex-col items-center rounded-3xl p-7">
          <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-blue-600 text-xl font-bold tracking-tight text-white shadow-lg shadow-blue-500/30">
            {initials}
          </div>
          <p className="mt-4 text-lg font-bold text-slate-900">{name}</p>
          <p className="text-sm font-medium text-slate-500">{phone}</p>
          <button
            type="button"
            className="mt-5 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 active:scale-[0.98]"
            onClick={() => router.push("/settings/profile")}
          >
            Edit profile
          </button>
        </div>

        <h2 className="mb-2 mt-8 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Your account
        </h2>
        <nav className="hirearn-card overflow-hidden rounded-2xl">
          {accountItems.map((item) => (
            <SettingsRow key={item.href} {...item} />
          ))}
        </nav>

        <h2 className="mb-2 mt-6 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          General &amp; support
        </h2>
        <nav className="hirearn-card overflow-hidden rounded-2xl">
          {generalItems.map((item) => (
            <SettingsRow key={item.href} {...item} />
          ))}
        </nav>

        <button
          type="button"
          className="mt-7 w-full rounded-2xl border border-red-200/90 bg-white py-3.5 text-center text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50/80 active:scale-[0.99]"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          Log out
        </button>
        <p className="mt-8 text-center text-[11px] font-medium tracking-wide text-slate-400">
          Hirearn Employer · Web 1.0.0
        </p>
      </div>
    </div>
  );
}

function SettingsRow({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-slate-100/90 px-4 py-3.5 last:border-b-0 active:bg-slate-50/80"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
        <SettingsIcon name={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-xs font-medium text-slate-500">{subtitle}</p>
      </div>
      <span className="text-slate-300">›</span>
    </Link>
  );
}

function SettingsIcon({ name }: { name: string }) {
  const stroke = "currentColor";
  if (name === "shield") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  if (name === "bank") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2}>
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
      </svg>
    );
  }
  if (name === "bell") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2}>
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    );
  }
  if (name === "help") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2}>
        <path d="M12 18h.01M7 8a5 5 0 0110 0c0 4-5 5-5 5" />
      </svg>
    );
  }
  if (name === "doc") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2}>
        <path d="M9 12h6m-6 4h6M5 5a2 2 0 012-2h5l5 5v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
      </svg>
    );
  }
  if (name === "lock") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2}>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M7 11V8a5 5 0 0110 0v3" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}
