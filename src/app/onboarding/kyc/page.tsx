"use client";

import { EmployerKycForm } from "@/components/employer/EmployerKycForm";
import { useAuth } from "@/contexts/auth-context";
import { getEmployerOnboardingPath } from "@/lib/auth/employerGating";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OnboardingKycPage() {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.isAdmin) {
      router.replace("/home");
      return;
    }
    if (user.role !== "employer") {
      router.replace("/login");
      return;
    }
    if (!user.isProfileComplete) {
      router.replace("/onboarding/employer-profile");
      return;
    }
    const next = getEmployerOnboardingPath(user);
    if (next === null) {
      router.replace("/home");
    } else if (next !== "/onboarding/kyc") {
      router.replace(next);
    }
  }, [ready, user, router]);

  return (
    <main className="pb-8">
      <h1 className="text-center text-xl font-bold tracking-tight text-slate-900">Verify your identity</h1>
      <p className="mt-2 text-center text-[15px] leading-relaxed text-slate-600">
        Required for trust and payments. Photos are encrypted and reviewed only for compliance.
      </p>
      <div className="mt-8">
        <EmployerKycForm onComplete={() => router.replace("/home")} />
      </div>
    </main>
  );
}
