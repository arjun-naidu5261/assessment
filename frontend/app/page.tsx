import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="relative max-w-xl text-center">
        <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-[var(--accent)]/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-neutral-900/5 blur-3xl" />

        <p className="font-display text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent-text)]">
          Hybrid assessment platform
        </p>
        <h1 className="font-display mt-6 text-4xl font-semibold leading-[1.15] tracking-tight text-[var(--text)] sm:text-5xl">
          Paper, digital, and analytics in one place
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-[var(--text-secondary)]">
          Design assessments with skills and content tags, publish to classes, export results to
          Excel, and trace learning with clear dashboards—built for schools that care about outcomes.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-[14px] bg-[var(--accent)] px-8 py-3.5 text-sm font-semibold text-neutral-900 shadow-[var(--shadow)] transition hover:brightness-95"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface)] px-8 py-3.5 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:border-[var(--accent-text)]/40 hover:bg-[var(--accent-muted)]"
          >
            Create account
          </Link>
        </div>

        <p className="mt-14 text-xs leading-relaxed text-[var(--muted)]">
          Teachers, students, and administrators — QR sheets, scans, and institutional insights.
        </p>
      </div>
    </div>
  );
}
