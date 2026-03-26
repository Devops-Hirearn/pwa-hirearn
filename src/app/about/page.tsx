export default function AboutPage() {
  return (
    <div className="space-y-6">
      <article className="hirearn-card rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">About Hirearn</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
          Hirearn connects businesses with reliable workers for daily shifts and longer engagements. Our
          employer tools help you publish roles, manage attendance, chat with applicants, and handle payouts
          in one calm, transparent flow.
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
          This progressive web app is tuned for iPhone and desktop so you get a native-quality experience
          with your existing Hirearn colours — deep blue accents on soft slate surfaces — without installing
          from the store.
        </p>
      </article>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="hirearn-card rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">Mission</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Make hiring fair, fast, and visible for every employer who depends on frontline teams.
          </p>
        </div>
        <div className="hirearn-card rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">Values</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Clarity in payments, respect in communication, and safety verified by identity checks.
          </p>
        </div>
      </div>

      <div className="hirearn-card rounded-3xl p-6 text-center sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Version</p>
        <p className="mt-2 text-lg font-bold text-slate-900">Employer web PWA</p>
        <p className="mt-1 text-sm text-slate-500">1.0.0 · Next.js</p>
      </div>
    </div>
  );
}
