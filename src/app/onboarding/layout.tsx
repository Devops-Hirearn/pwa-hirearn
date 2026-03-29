import type { ReactNode } from "react";
import { HirearnMark } from "@/components/brand/HirearnMark";

/** Full-screen onboarding (no employer shell / bottom nav). iOS-safe top padding. */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        "min-h-svh hirearn-mesh flex flex-col " +
        "pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      }
    >
      <header className="flex shrink-0 justify-center px-4 pb-2 pt-1">
        <HirearnMark className="justify-center opacity-90" />
      </header>
      <div className="mx-auto w-full max-w-lg flex-1 px-4 sm:px-5">{children}</div>
    </div>
  );
}
