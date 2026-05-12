"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

type Question = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  subject: string;
  skill: string;
  content: string;
  difficulty: string;
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [subject, setSubject] = useState("");
  const [skill, setSkill] = useState("");
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  const load = useCallback(async () => {
    const r = await api<{ questions: Question[] }>("/api/teacher/questions");
    setQuestions(r.questions);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  useEffect(() => {
    if (correctIndex >= options.length) setCorrectIndex(0);
  }, [options.length, correctIndex]);

  function addOption() {
    setOptions((o) => [...o, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((o) => o.filter((_, i) => i !== index));
    setCorrectIndex((ci) => {
      if (ci === index) return 0;
      if (ci > index) return ci - 1;
      return ci;
    });
  }

  function updateOption(index: number, value: string) {
    setOptions((o) => o.map((x, i) => (i === index ? value : x)));
  }

  function resetForm() {
    setPrompt("");
    setOptions(["", ""]);
    setCorrectIndex(0);
    setSubject("");
    setSkill("");
    setContent("");
    setDifficulty("medium");
  }

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = options.map((s) => s.trim());
    if (trimmed.some((s) => !s)) {
      setError("Fill in every answer choice, or remove empty rows.");
      return;
    }
    if (trimmed.length < 2) {
      setError("You need at least two options.");
      return;
    }
    if (correctIndex < 0 || correctIndex >= trimmed.length) {
      setError("Pick which option is correct.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await api("/api/teacher/questions", {
        method: "POST",
        body: JSON.stringify({
          text: prompt,
          options: trimmed,
          correctIndex,
          subject,
          skill,
          content,
          difficulty,
        }),
      });
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this question from your bank?")) return;
    try {
      await api(`/api/teacher/questions/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <header className="mb-10">
        <p className="font-display text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent-text)]">
          Authoring
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Question bank
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--text-secondary)]">
          Draft questions with any number of choices—add or remove options so each item fits what you
          teach. Tag by subject and skill to reuse them when building assessments.
        </p>
      </header>

      <form
        onSubmit={addQuestion}
        className="mb-14 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-[var(--text)]">
              New multiple-choice item
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Minimum two answers · mark the correct one · expand the list anytime
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-[10px] text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
          >
            Clear form
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-[12px] border border-[var(--error)]/35 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]">
            {error}
          </div>
        ) : null}

        <div className="mt-8 space-y-8">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Question prompt
            </span>
            <textarea
              required
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask clearly—students see exactly this wording."
              className="input-field w-full resize-y leading-relaxed placeholder:text-[var(--muted)]"
            />
          </label>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Answer choices ({options.length})
              </span>
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--depth)]/50 bg-[var(--depth-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-[var(--depth-soft)]/80"
              >
                <span aria-hidden className="text-base leading-none">
                  +
                </span>
                Add option
              </button>
            </div>
            <ul className="space-y-3">
              {options.map((opt, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-start gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg)]/50 p-3 sm:flex-nowrap sm:items-center"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--elevated)] font-mono text-sm font-semibold text-[var(--muted)]">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Choice ${i + 1}`}
                    className="input-field min-w-0 flex-1"
                    aria-label={`Answer option ${i + 1}`}
                  />
                  <button
                    type="button"
                    disabled={options.length <= 2}
                    onClick={() => removeOption(i)}
                    className={cn(
                      "shrink-0 rounded-[10px] px-3 py-2 text-sm font-medium transition",
                      options.length <= 2
                        ? "cursor-not-allowed text-[var(--muted)] opacity-40"
                        : "text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--error)]"
                    )}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <label className="block max-w-md">
            <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Correct answer
            </span>
            <select
              value={correctIndex}
              onChange={(e) => setCorrectIndex(Number(e.target.value))}
              className="input-field w-full"
            >
              {options.map((_, i) => (
                <option key={i} value={i}>
                  {String.fromCharCode(65 + i)} —{" "}
                  {options[i]?.trim() ? options[i].trim().slice(0, 48) : "(empty)"}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-5 sm:grid-cols-3">
            <label className="block sm:col-span-1">
              <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Subject
              </span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Biology"
                className="input-field w-full"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Skill / competency
              </span>
              <input
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="e.g. Data literacy"
                className="input-field w-full"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Difficulty
              </span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="input-field w-full"
              >
                <option value="easy">{DIFFICULTY_LABELS.easy}</option>
                <option value="medium">{DIFFICULTY_LABELS.medium}</option>
                <option value="hard">{DIFFICULTY_LABELS.hard}</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Unit or topic (optional)
            </span>
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chapter, standard code, or strand"
              className="input-field w-full max-w-xl"
            />
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-[12px] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[#1a1508] shadow-lg shadow-black/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save to bank"}
            </button>
          </div>
        </div>
      </form>

      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-[var(--text)]">
              Library ({questions.length})
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Every entry here can be dropped into an assessment.
            </p>
          </div>
        </div>

        <ul className="space-y-4">
          {questions.map((q) => (
            <li
              key={q.id}
              className="group rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)] transition hover:border-[var(--border-strong)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="font-display text-lg font-medium leading-snug text-[var(--text)]">
                  {q.text}
                </p>
                <button
                  type="button"
                  onClick={() => remove(q.id)}
                  className="shrink-0 rounded-[10px] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] opacity-80 transition hover:bg-[var(--error)]/15 hover:text-[var(--error)] group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
              <ul className="mt-4 space-y-2 border-l-2 border-[var(--depth)]/40 pl-4">
                {q.options.map((o, i) => (
                  <li
                    key={i}
                    className={cn(
                      "text-sm leading-relaxed",
                      i === q.correctIndex
                        ? "font-medium text-[var(--success)]"
                        : "text-[var(--text-secondary)]"
                    )}
                  >
                    <span className="mr-2 font-mono text-[var(--muted)]">{String.fromCharCode(65 + i)}.</span>
                    {o}
                    {i === q.correctIndex ? (
                      <span className="ml-2 rounded-full bg-[var(--success)]/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--success)]">
                        Key
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {[q.subject, q.skill, DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty]
                  .filter(Boolean)
                  .map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--border)] bg-[var(--bg)]/80 px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                {q.content ? (
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
                    {q.content}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {questions.length === 0 ? (
          <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-14 text-center text-[var(--muted)]">
            Your bank is empty—create your first question above.
          </p>
        ) : null}
      </section>
    </div>
  );
}
