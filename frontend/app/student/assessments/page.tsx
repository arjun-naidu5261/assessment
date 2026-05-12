"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Row = {
  id: string;
  title: string;
  className: string;
  questionCount: number;
  timeLimitMinutes: number | null;
  deliveryMode: string;
  paperScanPending?: boolean;
  submission: {
    submitted: boolean;
    score?: number;
    maxScore?: number;
    submittedAt?: string;
  };
};

type EnrolledClass = { id: string; name: string; joinCode: string };

export default function StudentAssessmentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [a, c] = await Promise.all([
      api<{ assessments: Row[] }>("/api/student/assessments"),
      api<{ classes: EnrolledClass[] }>("/api/student/classes"),
    ]);
    setRows(a.assessments);
    setClasses(c.classes);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  return (
    <div>
      <header className="mb-8">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent-text)]">
          Student
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Assessments
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
          You only see quizzes your teacher has <strong className="text-[var(--text)]">published</strong>{" "}
          for a class you joined.
        </p>
      </header>

      {classes.length > 0 ? (
        <div className="mb-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text)]">Your classes: </span>
          {classes.map((c) => c.name).join(", ")}
        </div>
      ) : null}

      {error ? <p className="mb-4 text-[var(--error)]">{error}</p> : null}

      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]/50">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-black/25 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Assessment</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Mode</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-[var(--border)]/60 last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--text)]">{a.title}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{a.className}</td>
                <td className="px-4 py-3 text-xs capitalize text-[var(--text-secondary)]">
                  {a.deliveryMode || "digital"}
                  {a.paperScanPending ? (
                    <span className="mt-1 block text-[var(--warn)]">scan pending</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {a.submission.submitted ? (
                    <span className="text-[var(--success)]">
                      {a.submission.score}/{a.submission.maxScore}
                    </span>
                  ) : a.deliveryMode === "paper" && a.paperScanPending ? (
                    <span className="text-[var(--warn)]">Awaiting teacher</span>
                  ) : (
                    <span className="text-[var(--warn)]">Not submitted</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {a.submission.submitted ? (
                    <Link
                      href={`/student/assessments/${a.id}/results`}
                      className="font-medium text-[var(--accent-text)] hover:underline"
                    >
                      Review
                    </Link>
                  ) : (
                    <Link
                      href={`/student/assessments/${a.id}`}
                      className="font-medium text-[var(--accent-text)] hover:underline"
                    >
                      {a.deliveryMode === "paper" ? "Paper instructions" : "Start"}
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="space-y-3 px-4 py-10 text-center">
            <p className="text-[var(--text-secondary)]">
              No published quizzes yet for your classes.
            </p>
            <p className="mx-auto max-w-md text-sm text-[var(--muted)]">
              If your teacher already built one but you don&apos;t see it, ask them to open{" "}
              <strong className="text-[var(--text-secondary)]">Assessments</strong> and switch the
              status from <strong className="text-[var(--warn)]">Draft</strong> to{" "}
              <strong className="text-[var(--success)]">Published</strong> (click the status badge).
            </p>
            {classes.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                <Link href="/student/join" className="text-[var(--accent-text)] hover:underline">
                  Join a class
                </Link>{" "}
                with your teacher&apos;s code first.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
