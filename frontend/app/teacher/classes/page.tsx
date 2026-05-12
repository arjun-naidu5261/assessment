"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type ClassRow = {
  id: string;
  name: string;
  joinCode: string;
  studentCount?: number;
  subject?: { id: string; name: string; code: string } | null;
};

type SubjectOpt = { id: string; name: string; code: string };

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [subjects, setSubjects] = useState<SubjectOpt[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([
      api<{ classes: ClassRow[] }>("/api/teacher/classes"),
      api<{ subjects: SubjectOpt[] }>("/api/teacher/subjects").catch(() => ({ subjects: [] })),
    ]);
    setClasses(r.classes);
    setSubjects(s.subjects);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/teacher/classes", {
        method: "POST",
        body: JSON.stringify({ name, subjectId: subjectId || undefined }),
      });
      setName("");
      setSubjectId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create class");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Classes</h1>
      <form
        onSubmit={createClass}
        className="mb-10 flex max-w-xl flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">New class name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Algebra Period 3"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Subject (optional)</span>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 min-w-[10rem]"
          >
            <option value="">—</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          Create class
        </button>
      </form>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-black/20 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Join code</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Students</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="border-b border-[var(--border)]/60 last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--text)]">{c.name}</td>
                <td className="px-4 py-3 font-mono text-[var(--accent)]">{c.joinCode}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {c.subject ? `${c.subject.name} (${c.subject.code})` : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--muted)]">
                  {c.studentCount ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {classes.length === 0 ? (
          <p className="px-4 py-8 text-center text-[var(--muted)]">
            No classes yet. Create one and share the join code with students.
          </p>
        ) : null}
      </div>
    </div>
  );
}
