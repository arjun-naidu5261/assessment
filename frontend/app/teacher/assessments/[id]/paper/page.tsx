"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, getStoredToken } from "@/lib/api";

type Capture = {
  id: string;
  status: string;
  student: { id: string; name: string; email: string } | null;
  imageUrl: string;
  cvNotes: string;
};

type Q = { id: string; text: string; options: string[] };

export default function PaperInboxPage() {
  const params = useParams();
  const aid = params.id as string;
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Record<string, number>>>({});

  const load = useCallback(async () => {
    const [c, a] = await Promise.all([
      api<{ captures: Capture[] }>(`/api/teacher/assessments/${aid}/paper-captures`),
      api<{ assessment: { title: string; questions: Q[] } }>(`/api/teacher/assessments/${aid}`),
    ]);
    setCaptures(c.captures);
    setTitle(a.assessment.title);
    setQuestions((a.assessment.questions || []) as Q[]);
  }, [aid]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  function setAns(captureId: string, qid: string, idx: number) {
    setAnswers((prev) => ({
      ...prev,
      [captureId]: { ...prev[captureId], [qid]: idx },
    }));
  }

  async function submitGrade(captureId: string) {
    const map = answers[captureId] || {};
    const payload = questions.map((q) => ({
      questionId: q.id,
      selectedIndex: map[q.id] ?? -1,
    }));
    setError("");
    setBusyId(captureId);
    try {
      await api(`/api/teacher/assessments/${aid}/paper-captures/${captureId}/validate`, {
        method: "POST",
        body: JSON.stringify({ answers: payload }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/teacher/assessments/${aid}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--accent-text)]"
        >
          ← Results & analytics
        </Link>
      </div>
      <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Paper capture inbox</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
        Student uploads appear here after they scan the QR on their sheet. Computer vision is not
        wired yet—review the image and enter the selected option for each question, then save the
        grade.
      </p>
      <div className="mt-4 max-w-2xl rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
        <p className="font-medium text-[var(--text)]">Where students upload (not on this page)</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Student opens the URL from the QR:{" "}
            <code className="rounded bg-black/10 px-1">/student/paper-upload?token=…</code>
          </li>
          <li>
            They sign in as the <strong className="text-[var(--text)]">same student</strong> the
            sheet was issued to (the QR is tied to that account).
          </li>
          <li>They attach a photo of the filled sheet and submit — then it appears here.</li>
        </ol>
      </div>
      {error ? <p className="mt-4 text-[var(--error)]">{error}</p> : null}

      <p className="mt-6 text-sm text-[var(--muted)]">
        Assessment: <strong className="text-[var(--text)]">{title}</strong>
      </p>

      <ul className="mt-8 space-y-10">
        {captures.map((c) => (
          <li
            key={c.id}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium text-[var(--text)]">{c.student?.name}</span>
                <span className="ml-2 text-sm text-[var(--muted)]">{c.student?.email}</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.status === "graded"
                    ? "bg-[var(--success)]/20 text-[var(--success)]"
                    : "bg-[var(--warn)]/20 text-[var(--warn)]"
                }`}
              >
                {c.status}
              </span>
            </div>
            {c.cvNotes ? (
              <p className="mb-4 text-xs text-[var(--muted)]">{c.cvNotes}</p>
            ) : null}
            <ScanImage captureId={c.id} />
            {c.status !== "graded" ? (
              <div className="mt-6 space-y-6">
                {questions.map((q, i) => (
                  <div key={q.id}>
                    <p className="mb-2 text-sm font-medium text-[var(--text)]">
                      {i + 1}. {q.text}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {q.options.map((opt, oi) => (
                        <label
                          key={oi}
                          className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--border)] px-3 py-2 text-sm hover:bg-white/[0.04]"
                        >
                          <input
                            type="radio"
                            name={`${c.id}-${q.id}`}
                            checked={(answers[c.id]?.[q.id] ?? -2) === oi}
                            onChange={() => setAns(c.id, q.id, oi)}
                          />
                          <span className="font-mono text-[var(--muted)]">
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={busyId === c.id}
                  onClick={() => submitGrade(c.id)}
                  className="rounded-[12px] bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[#1a1508] disabled:opacity-50"
                >
                  {busyId === c.id ? "Saving…" : "Save grade from scan"}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {captures.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          No paper uploads yet. Ask students to scan their sheet QR (or open the upload link from
          their assessment list), sign in, and submit a photo.
        </p>
      ) : null}
    </div>
  );
}

function ScanImage({ captureId }: { captureId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let objUrl: string | null = null;
    (async () => {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const t = getStoredToken();
      const res = await fetch(`${base}/api/teacher/paper-captures/${captureId}/file`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!res.ok || cancelled) return;
      const blob = await res.blob();
      if (cancelled) return;
      objUrl = URL.createObjectURL(blob);
      setSrc(objUrl);
    })();
    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [captureId]);
  if (!src) return <p className="text-sm text-[var(--muted)]">Loading image…</p>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Scan" className="max-h-96 rounded-lg border border-[var(--border)] object-contain" />
  );
}
