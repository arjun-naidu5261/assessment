"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type SubmissionRow = {
  id: string;
  student: { name: string; email: string } | null;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  source?: string;
};

type Analytics = {
  submissionCount: number;
  classAveragePercent: number;
  perQuestion: {
    questionId: string;
    text: string;
    skill: string;
    correctRate: number | null;
    attempted: number;
  }[];
};

/** Print-friendly report — use browser Print → Save as PDF (4.3 PDF export) */
export default function AssessmentReportPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [title, setTitle] = useState("");
  const [subs, setSubs] = useState<SubmissionRow[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([
      api<{ title: string; submissions: SubmissionRow[] }>(
        `/api/teacher/assessments/${id}/submissions`
      ),
      api<Analytics>(`/api/teacher/assessments/${id}/analytics`),
    ]);
    setTitle(s.title);
    setSubs(s.submissions);
    setAnalytics(a);
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="no-print mx-auto max-w-4xl border-b border-neutral-200 bg-[#fffef5] px-4 py-4 sm:px-6">
        <Link href={`/teacher/assessments/${id}`} className="text-sm text-neutral-600 hover:underline">
          ← Back to results
        </Link>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-[#fde047] px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm hover:brightness-95"
          >
            Print / Save as PDF
          </button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          In the print dialog, choose &quot;Save as PDF&quot; to download.
        </p>
      </div>

      {error ? (
        <p className="p-6 text-red-600">{error}</p>
      ) : (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <header className="border-b-2 border-neutral-900 pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
              Assessment report
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-neutral-900">{title}</h1>
            {analytics ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-neutral-200 bg-[#fffbeb] p-4">
                  <p className="text-xs text-neutral-600">Submissions</p>
                  <p className="text-2xl font-semibold tabular-nums">{analytics.submissionCount}</p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-[#fffbeb] p-4">
                  <p className="text-xs text-neutral-600">Class average</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {analytics.submissionCount ? `${analytics.classAveragePercent}%` : "—"}
                  </p>
                </div>
              </div>
            ) : null}
          </header>

          {analytics?.perQuestion?.length ? (
            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold text-neutral-900">Question analysis</h2>
              <table className="mt-4 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-300 bg-[#fef9c3]">
                    <th className="py-2 text-left font-semibold">Question</th>
                    <th className="py-2 text-left font-semibold">Skill</th>
                    <th className="py-2 text-right font-semibold">Correct rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.perQuestion.map((row) => (
                    <tr key={row.questionId} className="border-b border-neutral-100">
                      <td className="py-2 pr-4 align-top text-neutral-900">{row.text}</td>
                      <td className="py-2 text-neutral-600">{row.skill || "—"}</td>
                      <td className="py-2 text-right tabular-nums">
                        {row.correctRate != null ? `${row.correctRate}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold text-neutral-900">Student results</h2>
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-300 bg-[#fef9c3]">
                  <th className="py-2 text-left font-semibold">Student</th>
                  <th className="py-2 text-left font-semibold">Email</th>
                  <th className="py-2 text-right font-semibold">Score</th>
                  <th className="py-2 text-right font-semibold">%</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-100">
                    <td className="py-2 font-medium text-neutral-900">{s.student?.name ?? "—"}</td>
                    <td className="py-2 text-neutral-600">{s.student?.email ?? ""}</td>
                    <td className="py-2 text-right tabular-nums">
                      {s.score}/{s.maxScore}
                    </td>
                    <td className="py-2 text-right tabular-nums">{s.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {subs.length === 0 ? (
              <p className="mt-4 text-neutral-500">No submissions yet.</p>
            ) : null}
          </section>

          <footer className="mt-16 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
            Generated {new Date().toLocaleString()}
          </footer>
        </div>
      )}
    </div>
  );
}
