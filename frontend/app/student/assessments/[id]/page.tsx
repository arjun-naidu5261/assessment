"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

type Q = { id: string; text: string; options: string[]; skill?: string };

export default function TakeAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [already, setAlready] = useState(false);
  const [paperOnly, setPaperOnly] = useState(false);
  const [paperScanPending, setPaperScanPending] = useState(false);
  const [paperUploadUrl, setPaperUploadUrl] = useState<string | null>(null);
  const [paperAllowed, setPaperAllowed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const autoSubmitDone = useRef(false);

  const load = useCallback(async () => {
    const r = await api<{
      assessment: {
        title: string;
        alreadySubmitted: boolean;
        timeLimitMinutes: number | null;
        questions?: Q[];
        result?: { score: number; maxScore: number };
        paperOnly?: boolean;
        paperScanPending?: boolean;
        paperUploadUrl?: string | null;
        paperAllowed?: boolean;
      };
    }>(`/api/student/assessments/${id}`);
    const a = r.assessment;
    setTitle(a.title);
    setPaperOnly(Boolean(a.paperOnly));
    setPaperScanPending(Boolean(a.paperScanPending));
    setPaperUploadUrl(a.paperUploadUrl ?? null);
    setPaperAllowed(Boolean(a.paperAllowed));
    if (a.alreadySubmitted) {
      setAlready(true);
      return;
    }
    setQuestions(a.questions || []);
    if (a.timeLimitMinutes && a.timeLimitMinutes > 0) {
      const end = Date.now() + a.timeLimitMinutes * 60 * 1000;
      setDeadline(end);
    }
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  useEffect(() => {
    if (!deadline) {
      setRemaining(null);
      return;
    }
    const t = setInterval(() => {
      const sec = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemaining(sec);
      if (sec <= 0) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [deadline]);

  const timeLabel = useMemo(() => {
    if (remaining == null) return null;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [remaining]);

  const submit = useCallback(async () => {
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedIndex: answers[q.id] ?? -1,
        })),
      };
      await api(`/api/student/assessments/${id}/submit`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/student/assessments/${id}/results`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [answers, id, questions, router]);

  useEffect(() => {
    if (
      remaining === 0 &&
      deadline &&
      questions.length > 0 &&
      !already &&
      !submitting &&
      !autoSubmitDone.current
    ) {
      autoSubmitDone.current = true;
      submit();
    }
  }, [remaining, deadline, questions.length, already, submitting, submit]);

  if (already) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <p className="mb-4 text-[var(--muted)]">You already submitted this assessment.</p>
        <Link href={`/student/assessments/${id}/results`} className="text-[var(--accent)] hover:underline">
          View results
        </Link>
      </div>
    );
  }

  if (paperOnly) {
    return (
      <div>
        <Link
          href="/student/assessments"
          className="text-sm text-[var(--muted)] hover:text-[var(--accent-text)]"
        >
          ← Assessments
        </Link>
        <h1 className="mt-4 font-display text-2xl font-semibold text-[var(--text)]">{title}</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          This quiz uses a <strong className="text-[var(--text)]">printed answer sheet</strong> with a
          personal QR code. Complete the bubbles, then photograph the page and upload.
        </p>
        {paperScanPending ? (
          <p className="mt-6 rounded-[12px] border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-4 py-3 text-sm text-[var(--warn)]">
            Your scan is with your teacher for validation. You’ll see results after they save your
            grade.
          </p>
        ) : null}
        {paperUploadUrl ? (
          <Link
            href={paperUploadUrl}
            className="mt-8 inline-block rounded-[12px] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[#1a1508]"
          >
            Open upload page (camera)
          </Link>
        ) : (
          <p className="mt-6 text-sm text-[var(--error)]">
            Your teacher has not generated QR sheets yet. Ask them to use “Generate QR sheets” on the
            print page.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/student/assessments"
            className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
          >
            ← Assessments
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        {timeLabel != null ? (
          <div
            className={`rounded-lg border px-4 py-2 font-mono text-lg tabular-nums ${
              remaining === 0
                ? "border-red-500/50 text-[var(--error)]"
                : "border-[var(--border)] text-[var(--text)]"
            }`}
          >
            {remaining === 0 ? "Time up" : timeLabel}
          </div>
        ) : null}
      </div>
      {error ? <p className="mb-4 text-[var(--error)]">{error}</p> : null}

      {paperAllowed && paperUploadUrl ? (
        <div className="mb-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          <strong className="text-[var(--text)]">Hybrid:</strong> you may submit online below or{" "}
          <Link href={paperUploadUrl} className="font-medium text-[var(--accent-text)] hover:underline">
            upload a photo of your paper sheet
          </Link>
          .
          {paperScanPending ? (
            <span className="mt-2 block text-[var(--warn)]">
              You already have a scan pending review — finish online only after your teacher
              processes it or ask them to help.
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-8">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
          >
            <p className="mb-1 text-xs uppercase tracking-wide text-[var(--muted)]">
              Question {i + 1}
              {q.skill ? ` · ${q.skill}` : ""}
            </p>
            <p className="mb-4 font-medium text-[var(--text)]">{q.text}</p>
            <ul className="space-y-2">
              {q.options.map((opt, idx) => (
                <li key={idx}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-black/[0.03]">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === idx}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {questions.length > 0 ? (
        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit()}
            className="rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-neutral-900 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit assessment"}
          </button>
        </div>
      ) : questions.length === 0 && !error ? (
        <p className="text-[var(--muted)]">Loading…</p>
      ) : null}
    </div>
  );
}
