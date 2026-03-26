/** Compact brand mark for auth and headers — same primary colour as app */
export function HirearnMark({ className = "" }: { className?: string }) {
  return (
    <div className={"flex items-center gap-2.5 " + className}>
      <div
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2563EB] shadow-lg shadow-blue-500/25"
        aria-hidden
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
          <path
            d="M12 3L4 7v10l8 4 8-4V7l-8-4z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M12 12l8-4M12 12v10M12 12L4 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-left leading-tight">
        <p className="text-lg font-bold tracking-tight text-slate-900">Hirearn</p>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Employers</p>
      </div>
    </div>
  );
}
