"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Subject = { id: string; name: string; code: string; description: string; active: boolean };

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const load = useCallback(async () => {
    const r = await api<{ subjects: Subject[] }>("/api/admin/subjects");
    setSubjects(r.subjects);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/admin/subjects", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ name: "", code: "", description: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this subject? Classes may lose the link.")) return;
    try {
      await api(`/api/admin/subjects/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Subjects</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Institution-wide subject catalogue for class configuration.
        </p>
      </header>
      {error ? <p className="mb-4 text-[var(--error)]">{error}</p> : null}

      <form
        onSubmit={add}
        className="mb-10 flex flex-wrap items-end gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Name</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Code</span>
          <input
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="input-field w-28 font-mono uppercase"
          />
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Description</span>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field"
          />
        </label>
        <button
          type="submit"
          className="rounded-[12px] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[#1a1508]"
        >
          Add subject
        </button>
      </form>

      <ul className="space-y-2">
        {subjects.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <div>
              <span className="font-medium text-[var(--text)]">{s.name}</span>
              <span className="ml-2 font-mono text-sm text-[var(--accent-text)]">{s.code}</span>
              {!s.active ? (
                <span className="ml-2 text-xs text-[var(--warn)]">(inactive)</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => remove(s.id)}
              className="text-sm text-[var(--error)] hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
