import type { ReactNode } from "react";

export function FormSectionCard({
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"hirearn-card rounded-3xl p-5 sm:p-6 " + className}>
      {eyebrow ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>
      ) : null}
      <div className={eyebrow ? "mt-1" : ""}>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export const formFieldLabelClass =
  "block text-[11px] font-bold uppercase tracking-wider text-slate-500";

export const formInputClass = "hirearn-input mt-2";

export const formTextareaClass = "hirearn-input mt-2 min-h-[100px] resize-y";
