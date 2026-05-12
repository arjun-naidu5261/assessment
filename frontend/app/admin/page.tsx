"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Insights = {
  counts: {
    teachers: number;
    students: number;
    admins: number;
    classes: number;
    subjects: number;
    assessments: number;
    submissions: number;
  };
  atRisk: {
    percentage: number;
    score: number;
    maxScore: number;
    submittedAt: string;
    studentName: string;
    studentEmail: string;
    assessmentTitle: string;
  }[];
};

export default function AdminHomePage() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api<Insights>("/api/admin/insights");
        if (!cancelled) setInsights(r);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const c = insights?.counts;

  return (
    <div>
      <header className="mb-10">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent-text)]">
          Administration
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-[var(--text)]">
          Institutional overview
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
          District-level visibility (4.4): enrollment, activity, and learners who may need support
          based on recent scores under 40%.
        </p>
      </header>
      {error ? <p className="mb-4 text-[var(--error)]">{error}</p> : null}

      {c ? (
        <>
          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Teachers" value={c.teachers} href="/admin/users" hint="accounts" />
            <Stat label="Students" value={c.students} href="/admin/users" hint="accounts" />
            <Stat label="Classes" value={c.classes} href="/admin/classes" />
            <Stat label="Live subjects" value={c.subjects} href="/admin/subjects" />
          </div>
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
              <p className="text-sm text-[var(--muted)]">Assessments created</p>
              <p className="font-display mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
                {c.assessments}
              </p>
            </div>
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
              <p className="text-sm text-[var(--muted)]">Total submissions</p>
              <p className="font-display mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
                {c.submissions}
              </p>
            </div>
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--accent-muted)] p-6 shadow-[var(--shadow)]">
              <p className="text-sm font-medium text-neutral-800">Administrators</p>
              <p className="font-display mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
                {c.admins}
              </p>
            </div>
          </div>

          <div className="mb-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <h2 className="font-display text-lg font-semibold text-[var(--text)]">
              Activity snapshot
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Relative scale — operational pulse across the institution
            </p>
            <div className="mt-6 space-y-4">
              <BarRow label="Students" value={c.students} max={Math.max(c.students, c.teachers, c.classes, c.assessments, 1)} />
              <BarRow label="Teachers" value={c.teachers} max={Math.max(c.students, c.teachers, c.classes, c.assessments, 1)} />
              <BarRow label="Classes" value={c.classes} max={Math.max(c.students, c.teachers, c.classes, c.assessments, 1)} />
              <BarRow label="Assessments" value={c.assessments} max={Math.max(c.students, c.teachers, c.classes, c.assessments, 1)} />
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--warn)]/35 bg-[var(--accent-muted)] p-6">
            <h2 className="font-display text-lg font-semibold text-amber-950">
              Early warning — recent scores under 40%
            </h2>
            <p className="mt-1 text-sm text-neutral-800">
              Latest graded attempts across the platform (sample). Use with teacher dashboards for
              follow-up.
            </p>
            {insights.atRisk.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-700">No recent low scores in the sample window.</p>
            ) : (
              <ul className="mt-4 divide-y divide-amber-200/80 rounded-lg border border-amber-200/60 bg-white">
                {insights.atRisk.slice(0, 12).map((row, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="font-medium text-neutral-900">{row.studentName}</span>
                    <span className="text-neutral-600">{row.assessmentTitle}</span>
                    <span className="tabular-nums font-semibold text-amber-900">{row.percentage}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : !error ? (
        <p className="text-[var(--muted)]">Loading…</p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: number;
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] transition hover:border-[var(--border-strong)]"
    >
      <p className="text-sm text-[var(--muted)]">
        {label}
        {hint ? <span className="text-xs text-[var(--muted)]"> ({hint})</span> : null}
      </p>
      <p className="font-display mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">{value}</p>
    </Link>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max ? Math.min(100, Math.round((100 * value) / max)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="tabular-nums font-medium text-[var(--text)]">{value}</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[var(--depth-soft)]">
        <div
          className="h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
