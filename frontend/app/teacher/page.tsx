"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Summary = {
  classes: number;
  questions: number;
  assessments: number;
  publishedAssessments: number;
};

type AssessmentRow = { id: string; title: string; deliveryMode?: string; published?: boolean };

export default function TeacherHomePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<AssessmentRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cRes, qRes, aRes] = await Promise.all([
          api<{ classes: unknown[] }>("/api/teacher/classes"),
          api<{ questions: unknown[] }>("/api/teacher/questions"),
          api<{ assessments: AssessmentRow[] }>("/api/teacher/assessments"),
        ]);
        if (cancelled) return;
        const published = aRes.assessments.filter((a) => a.published).length;
        setSummary({
          classes: cRes.classes.length,
          questions: qRes.questions.length,
          assessments: aRes.assessments.length,
          publishedAssessments: published,
        });
        setRecent(aRes.assessments.slice(0, 6));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <header className="mb-10">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent-text)]">
          Dashboard
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Overview
        </h1>
      </header>
      {error ? (
        <p className="mb-4 text-[var(--error)]">{error}</p>
      ) : null}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Classes" value={summary?.classes ?? "—"} />
        <StatCard label="Questions in bank" value={summary?.questions ?? "—"} />
        <StatCard label="Assessments" value={summary?.assessments ?? "—"} />
        <StatCard label="Published" value={summary?.publishedAssessments ?? "—"} />
      </div>
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Quick actions</h2>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Create a class and share the join code with students. Build your bank, then assemble an
          assessment and publish it when ready.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/teacher/classes"
            className="rounded-[12px] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-[var(--shadow)] transition hover:brightness-95"
          >
            Manage classes
          </Link>
          <Link
            href="/teacher/questions"
            className="rounded-[12px] border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--accent-muted)]"
          >
            Question bank
          </Link>
          <Link
            href="/teacher/assessments/new"
            className="rounded-[12px] border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--accent-muted)]"
          >
            New assessment
          </Link>
        </div>
      </div>

      {recent.length > 0 ? (
        <div className="mt-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <h2 className="font-display text-lg font-semibold text-[var(--text)]">
            Recent assessments
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Quick links to results, Excel export, and reports (4.4 dashboards)
          </p>
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {recent.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="font-medium text-[var(--text)]">{a.title}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs capitalize text-[var(--accent-text)]">
                    {a.deliveryMode || "digital"}
                  </span>
                  <Link
                    href={`/teacher/assessments/${a.id}`}
                    className="text-sm font-medium text-[var(--accent-text)] hover:underline"
                  >
                    Open dashboard
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.5)]">
      <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
      <p className="font-display mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}
