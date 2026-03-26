import { PublicBackLink } from "@/components/layout/PublicBackLink";
import { Suspense, type ReactNode } from "react";

export function PublicPageFrame({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow: string;
}) {
  return (
    <div className="min-h-svh hirearn-mesh">
      <header className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/75 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Suspense
            fallback={
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white opacity-50">
                ←
              </span>
            }
          >
            <PublicBackLink />
          </Suspense>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{eyebrow}</span>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-8 pb-16 sm:px-6">{children}</div>
    </div>
  );
}
