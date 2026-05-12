"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type ClassRow = { id: string; name: string };
type Question = { id: string; text: string; skill?: string };

export default function NewAssessmentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [published, setPublished] = useState(true);
  const [deliveryMode, setDeliveryMode] = useState<"digital" | "paper" | "hybrid">("digital");
  const [timeLimit, setTimeLimit] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [c, q] = await Promise.all([
      api<{ classes: ClassRow[] }>("/api/teacher/classes"),
      api<{ questions: Question[] }>("/api/teacher/questions"),
    ]);
    setClasses(c.classes);
    setQuestions(q.questions);
    setClassId((prev) => prev || c.classes[0]?.id || "");
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  function toggle(qid: string) {
    setSelected((s) => ({ ...s, [qid]: !s[qid] }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const questionIds = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (questionIds.length === 0) {
      setError("Select at least one question");
      return;
    }
    if (!classId) {
      setError("Create a class first");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api("/api/teacher/assessments", {
        method: "POST",
        body: JSON.stringify({
          title,
          classId,
          questionIds,
          published,
          deliveryMode,
          timeLimitMinutes: timeLimit === "" ? null : Number(timeLimit),
        }),
      });
      router.push("/teacher/assessments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">New assessment</h1>
      <form
        onSubmit={onSubmit}
        className="max-w-3xl space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Class</span>
          <select
            required
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Delivery</span>
          <select
            value={deliveryMode}
            onChange={(e) => setDeliveryMode(e.target.value as "digital" | "paper" | "hybrid")}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 max-w-md"
          >
            <option value="digital">Digital — students take online only</option>
            <option value="paper">Paper — QR sheets + camera upload + teacher validation</option>
            <option value="hybrid">Hybrid — online and/or paper scan</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Time limit (minutes, optional)</span>
          <input
            type="number"
            min={1}
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            placeholder="No limit"
            className="max-w-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          />
        </label>
        <div className="rounded-[12px] border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="mt-1"
            />
            <span>
              <strong className="text-[var(--text)]">Visible to students</strong> — only published
              quizzes appear on the student&apos;s Assessments page. Leave unchecked to save as a
              private draft first.
            </span>
          </label>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium text-[var(--text)]">Questions from bank</p>
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] p-3">
            {questions.map((q) => (
              <label
                key={q.id}
                className="flex cursor-pointer gap-3 rounded-lg p-2 hover:bg-white/5"
              >
                <input type="checkbox" checked={!!selected[q.id]} onChange={() => toggle(q.id)} />
                <span className="text-sm">
                  <span className="text-[var(--text)]">{q.text}</span>
                  {q.skill ? (
                    <span className="ml-2 text-xs text-[var(--muted)]">({q.skill})</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          {questions.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Add questions in{" "}
              <Link href="/teacher/questions" className="text-[var(--accent)] hover:underline">
                Question bank
              </Link>{" "}
              first.
            </p>
          ) : null}
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Create assessment"}
          </button>
          <Link
            href="/teacher/assessments"
            className="rounded-lg border border-[var(--border)] px-5 py-2 text-sm hover:bg-white/5"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
