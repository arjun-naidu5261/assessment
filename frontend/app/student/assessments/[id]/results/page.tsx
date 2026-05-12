"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type FeedbackRow = {
  questionId: string;
  text: string;
  skill?: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  correct: boolean;
};

export default function StudentResultsPage() {
  const params = useParams();
  const assessmentId = params.id as string;
  const [title, setTitle] = useState("");
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await api<{
      title: string;
      score: number;
      maxScore: number;
      percentage: number;
      feedback: FeedbackRow[];
    }>(`/api/student/results/${assessmentId}`);
    setTitle(r.title);
    setScore(r.score);
    setMaxScore(r.maxScore);
    setPercentage(r.percentage);
    setFeedback(r.feedback);
  }, [assessmentId]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/student/assessments"
          className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
        >
          ← Assessments
        </Link>
      </div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">{title}</h1>
      {error ? (
        <p className="text-red-300">{error}</p>
      ) : (
        <>
          <div className="mb-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--muted)]">Your score</p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-[var(--text)]">
              {score}/{maxScore}{" "}
              <span className="text-2xl font-normal text-[var(--muted)]">({percentage}%)</span>
            </p>
          </div>
          <h2 className="mb-4 text-lg font-medium">Feedback by question</h2>
          <ul className="space-y-4">
            {feedback.map((f, i) => (
              <li
                key={f.questionId}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[var(--muted)]">Q{i + 1}</span>
                  {f.skill ? (
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent-text)]">
                      {f.skill}
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      f.correct
                        ? "bg-[var(--success)]/20 text-[var(--success)]"
                        : "bg-red-500/15 text-[var(--error)]"
                    }`}
                  >
                    {f.correct ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <p className="mb-3 font-medium text-[var(--text)]">{f.text}</p>
                <ul className="space-y-1 text-sm text-[var(--muted)]">
                  {f.options.map((o, idx) => (
                    <li key={idx}>
                      {o}{" "}
                      {idx === f.selectedIndex ? (
                        <span className="font-medium text-[var(--text)]">(your answer)</span>
                      ) : null}{" "}
                      {idx === f.correctIndex ? (
                        <span className="text-[var(--success)]">(correct)</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
