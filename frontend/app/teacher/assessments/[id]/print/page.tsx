"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Sheet = {
  token: string;
  qrUrl: string;
  qrDataUrl: string;
  student: { id: string; name: string; email: string };
};

type Q = { id: string; text: string; optionCount: number; options: string[] };

export default function PrintAnswerSheetsPage() {
  const params = useParams();
  const id = params.id as string;
  const [title, setTitle] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadMeta = useCallback(async () => {
    const r = await api<{ assessment: { title: string; deliveryMode: string; questions: Q[] } }>(
      `/api/teacher/assessments/${id}`
    );
    setTitle(r.assessment.title);
    setDeliveryMode(r.assessment.deliveryMode || "digital");
    setQuestions((r.assessment.questions || []) as Q[]);
  }, [id]);

  const loadSheets = useCallback(async () => {
    try {
      const r = await api<{
        sheets: Sheet[];
      }>(`/api/teacher/assessments/${id}/answer-sheets`);
      setSheets(r.sheets);
      setError("");
    } catch (e) {
      setSheets([]);
      const msg = e instanceof Error ? e.message : "";
      // Expected before first "Generate" — avoid showing as a failure.
      if (msg && !msg.includes("No answer sheets")) {
        setError(msg);
      }
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadMeta();
        if (!cancelled) await loadSheets();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMeta, loadSheets]);

  async function generate() {
    setError("");
    setGenerating(true);
    try {
      await api(`/api/teacher/assessments/${id}/answer-sheets/generate`, { method: "POST" });
      await loadSheets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="print-root">
      <div className="no-print mb-8 space-y-4">
        <Link
          href={`/teacher/assessments/${id}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--accent-text)]"
        >
          ← Back to results
        </Link>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">
          Printable answer sheets
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Each student gets a unique QR code linking to the upload page (camera / scan). Bubble
          layout matches your multiple-choice items. Generate tokens after students have joined the
          class.
        </p>
        <div className="max-w-2xl rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          <p className="font-medium text-[var(--text)]">How to generate QR codes</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Set assessment delivery to <strong className="text-[var(--text)]">paper</strong> or{" "}
              <strong className="text-[var(--text)]">hybrid</strong> (optional but recommended).</li>
            <li>Publish the assessment so the QR link works.</li>
            <li>Students must join the class before you click &quot;Generate&quot; (one token per
              enrolled student).</li>
            <li>Click <strong className="text-[var(--text)]">Generate QR sheets for class</strong>,
              then <strong className="text-[var(--text)]">Print all</strong>.</li>
          </ol>
          <p className="mt-3 text-xs text-[var(--muted)]">
            QR URLs use <code className="rounded bg-black/10 px-1">FRONTEND_ORIGIN</code> in{" "}
            <code className="rounded bg-black/10 px-1">backend/.env</code>. For phone cameras, use
            your machine&apos;s LAN URL (e.g. <code className="rounded bg-black/10 px-1">http://192.168.x.x:3000</code>
            ) — not <code className="rounded bg-black/10 px-1">localhost</code> — then regenerate
            sheets.
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Delivery mode: <strong className="text-[var(--text-secondary)]">{deliveryMode}</strong>{" "}
          (paper or hybrid recommended for sheets)
        </p>
        {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={generating}
            onClick={() => generate()}
            className="rounded-[12px] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[#1a1508] disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate QR sheets for class"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={sheets.length === 0}
            className="rounded-[12px] border border-[var(--border-strong)] px-5 py-2.5 text-sm font-medium text-[var(--text)] disabled:opacity-40"
          >
            Print all
          </button>
        </div>
        {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
        {sheets.length === 0 && !loading ? (
          <p className="text-sm text-[var(--warn)]">
            No sheets yet — generate above (requires enrolled students).
          </p>
        ) : null}
      </div>

      <div className="sheet-batch space-y-16">
        {sheets.map((s) => (
          <section
            key={s.token}
            className="sheet-page mx-auto max-w-3xl break-after-page rounded-lg border border-[var(--border)] bg-white p-8 text-black shadow-none print:border-0 print:shadow-none"
          >
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  StudioAssess · answer sheet
                </p>
                <h2 className="mt-1 text-xl font-bold text-neutral-900">{title}</h2>
                <p className="mt-2 text-sm text-neutral-700">
                  <strong>Student:</strong> {s.student.name}
                </p>
                <p className="text-sm text-neutral-600">{s.student.email}</p>
              </div>
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.qrDataUrl} alt="QR" className="mx-auto h-36 w-36" />
                <p className="mt-1 max-w-[10rem] break-all text-[10px] text-neutral-500">
                  Scan to upload completed sheet
                </p>
              </div>
            </header>
            <ol className="space-y-6">
              {questions.map((q, qi) => (
                <li key={q.id} className="border-b border-neutral-100 pb-4">
                  <p className="text-sm font-medium text-neutral-900">
                    {qi + 1}. {q.text}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    {(q.options || []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2 text-xs text-neutral-800">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-neutral-400 font-mono font-semibold">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span className="max-w-[14rem]">{opt}</span>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <footer className="mt-8 border-t border-neutral-200 pt-4 text-[10px] text-neutral-500">
              Sheet ID: {s.token.slice(0, 12)}… · Do not share with other students.
            </footer>
          </section>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-root {
            background: white !important;
          }
          .sheet-page {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}
