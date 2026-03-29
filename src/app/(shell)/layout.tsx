"use client";

import { BottomNav } from "@/components/employer/BottomNav";
import { useAuth } from "@/contexts/auth-context";
import { getEmployerOnboardingPath } from "@/lib/auth/employerGating";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export default function ShellLayout({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hideBottomNav = /^\/messages\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.isAdmin) {
      return;
    }
    if (user.role && user.role !== "employer") {
      return;
    }
    if (user.role === "employer") {
      const gate = getEmployerOnboardingPath(user);
      if (gate) router.replace(gate);
    }
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 hirearn-mesh">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Loading your workspace…</p>
      </div>
    );
  }

  if (!user.isAdmin && user.role === "employer" && getEmployerOnboardingPath(user)) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 hirearn-mesh px-4 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Setting up your account…</p>
      </div>
    );
  }

  if (!user.isAdmin && user.role && user.role !== "employer") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 hirearn-mesh px-6 text-center">
        <div className="hirearn-card max-w-sm rounded-3xl p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="mt-5 text-lg font-bold text-slate-900">Employer access only</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            This web app is built for employer accounts. Your number is registered as a worker — use the
            Hirearn worker app, or sign out and switch accounts.
          </p>
          <button
            type="button"
            className="hirearn-btn-primary mt-6 w-full"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        "mx-auto min-h-svh w-full max-w-full bg-[var(--hirearn-surface)] px-4 sm:px-6 lg:px-8 sm:max-w-lg md:max-w-xl lg:max-w-2xl " +
        (hideBottomNav ? "" : "pb-[calc(5rem+env(safe-area-inset-bottom))]")
      }
    >
      {children}
      {hideBottomNav ? null : <BottomNav />}
    </div>
  );
}

