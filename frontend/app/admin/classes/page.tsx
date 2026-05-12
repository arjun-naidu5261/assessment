"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Row = {
  id: string;
  name: string;
  joinCode: string;
  studentCount: number;
  teacher: { name: string; email: string } | null;
  subject: { name: string; code: string } | null;
};

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<Row[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await api<{ classes: Row[] }>("/api/admin/classes");
    setClasses(r.classes);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Classes</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Read-only directory of all classes, teachers, and linked subjects.
        </p>
      </header>
      {error ? <p className="mb-4 text-[var(--error)]">{error}</p> : null}
      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-black/25 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Join</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="border-b border-[var(--border)]/60">
                <td className="px-4 py-3 font-medium text-[var(--text)]">{c.name}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {c.teacher ? `${c.teacher.name} · ${c.teacher.email}` : "—"}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {c.subject ? `${c.subject.name} (${c.subject.code})` : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">{c.studentCount}</td>
                <td className="px-4 py-3 font-mono text-[var(--accent-text)]">{c.joinCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
