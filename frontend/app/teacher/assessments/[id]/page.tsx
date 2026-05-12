"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, apiDownload } from "@/lib/api";

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

export default function TeacherAssessmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [title, setTitle] = useState("");
  const [subs, setSubs] = useState<SubmissionRow[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<string>("digital");
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const [s, a, meta] = await Promise.all([
      api<{
        title: string;
        submissions: SubmissionRow[];
      }>(`/api/teacher/assessments/${id}/submissions`),
      api<Analytics>(`/api/teacher/assessments/${id}/analytics`),
      api<{ assessment: { deliveryMode: string } }>(`/api/teacher/assessments/${id}`),
    ]);
    setTitle(s.title);
    setSubs(s.submissions);
    setAnalytics(a);
    setDeliveryMode(meta.assessment.deliveryMode || "digital");
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  async function saveDeliveryMode() {
    setDeliverySaving(true);
    setError("");
    try {
      await api(`/api/teacher/assessments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ deliveryMode }),
      });
      await load();
      setDeliveryNote(
        deliveryMode === "digital"
          ? "Saved. Paper uploads stay disabled until you switch to paper or hybrid."
          : "Saved. Generate QR sheets (Printable QR sheets), then students can upload scans."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update delivery mode");
    } finally {
      setDeliverySaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/teacher/assessments"
          className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
        >
          ← All assessments
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title || "Assessment"}</h1>
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium capitalize text-[var(--accent-text)]">
          {deliveryMode}
        </span>
        <Link
          href={`/teacher/assessments/${id}/print`}
          className="text-sm font-medium text-[var(--accent-text)] hover:underline"
        >
          Printable QR sheets
        </Link>
        <Link
          href={`/teacher/assessments/${id}/paper`}
          className="text-sm font-medium text-[var(--accent-text)] hover:underline"
        >
          Paper inbox
        </Link>
        <button
          type="button"
          disabled={exporting}
          onClick={() => {
            setExporting(true);
            setError("");
            apiDownload(`/api/teacher/assessments/${id}/export/excel`, "results.xlsx").catch((e) =>
              setError(e instanceof Error ? e.message : "Export failed")
            ).finally(() => setExporting(false));
          }}
          className="rounded-[10px] border border-[var(--border-strong)] bg-[var(--accent-muted)] px-3 py-1.5 text-sm font-semibold text-neutral-900 hover:bg-[var(--accent)] disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export Excel"}
        </button>
        <Link
          href={`/teacher/assessments/${id}/report`}
          className="rounded-[10px] border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--depth-soft)]"
        >
          Print / PDF report
        </Link>
      </div>

      <div className="mb-8 max-w-xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-sm font-medium text-[var(--text)]">Delivery mode</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Digital = online quiz only. Paper / hybrid = QR sheets + student photo upload + your paper
          inbox. If this shows &quot;digital&quot; but you wanted paper, pick paper or hybrid and
          save.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--muted)]">Mode</span>
            <select
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value)}
              className="min-w-[14rem] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
            >
              <option value="digital">Digital</option>
              <option value="paper">Paper</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <button
            type="button"
            disabled={deliverySaving}
            onClick={() => saveDeliveryMode()}
            className="rounded-[12px] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50"
          >
            {deliverySaving ? "Saving…" : "Save delivery mode"}
          </button>
        </div>
        {deliveryNote ? <p className="mt-3 text-sm text-[var(--success)]">{deliveryNote}</p> : null}
      </div>

      {error ? <p className="mb-4 text-[var(--error)]">{error}</p> : null}

      {analytics &&
      analytics.submissionCount > 0 &&
      (analytics.classAveragePercent < 50 || subs.some((s) => s.percentage < 40)) ? (
        <div className="mb-6 rounded-xl border border-[var(--warn)]/40 bg-[var(--accent-muted)] px-4 py-3 text-sm text-neutral-900">
          <p className="font-semibold text-amber-900">Early warning</p>
          <p className="mt-1 text-neutral-800">
            {analytics.classAveragePercent < 50
              ? `Class average is below 50% (${analytics.classAveragePercent}%). Consider reviewing instruction or items. `
              : null}
            {subs.some((s) => s.percentage < 40)
              ? `${subs.filter((s) => s.percentage < 40).length} student(s) scored under 40%.`
              : null}
          </p>
        </div>
      ) : null}

      {analytics ? (
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <p className="text-sm text-[var(--muted)]">Submissions</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--text)]">
              {analytics.submissionCount}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <p className="text-sm text-[var(--muted)]">Class average</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--text)]">
              {analytics.submissionCount ? `${analytics.classAveragePercent}%` : "—"}
            </p>
          </div>
        </div>
      ) : null}

      {analytics?.perQuestion?.length ? (
        <div className="mb-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <h2 className="font-display text-lg font-semibold text-[var(--text)]">Performance by question</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Correct rate — skill traceability (4.3)</p>
          <ul className="mt-6 space-y-5">
            {analytics.perQuestion.map((row) => (
              <li key={row.questionId}>
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="max-w-xl font-medium text-[var(--text)]">{row.text}</span>
                  <span className="text-[var(--muted)]">{row.skill || "—"}</span>
                </div>
                <div className="mt-2 flex h-7 items-center gap-3">
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--depth-soft)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                      style={{ width: `${row.correctRate ?? 0}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-sm tabular-nums text-[var(--text)]">
                    {row.correctRate != null ? `${row.correctRate}%` : "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <h2 className="mb-4 text-lg font-medium text-[var(--text)]">Student results</h2>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent-text)]">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-b border-[var(--border)]/60 last:border-0">
                <td className="px-4 py-3">
                  <span className="font-medium text-[var(--text)]">{s.student?.name ?? "—"}</span>
                  <span className="ml-2 text-[var(--muted)]">{s.student?.email}</span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {s.score}/{s.maxScore}{" "}
                  <span className="text-[var(--muted)]">({s.percentage}%)</span>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{s.source || "digital"}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {subs.length === 0 ? (
          <p className="px-4 py-8 text-center text-[var(--muted)]">No submissions yet.</p>
        ) : null}
      </div>
    </div>
  );
}
