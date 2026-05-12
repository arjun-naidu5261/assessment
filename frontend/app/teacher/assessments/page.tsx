"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Assessment = {
  id: string;
  title: string;
  className: string;
  published: boolean;
  deliveryMode?: string;
  questions: unknown[];
};

export default function TeacherAssessmentsPage() {
  const [items, setItems] = useState<Assessment[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await api<{ assessments: Assessment[] }>("/api/teacher/assessments");
    setItems(r.assessments);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  async function togglePublish(a: Assessment) {
    try {
      await api(`/api/teacher/assessments/${a.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !a.published }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
        <Link
          href="/teacher/assessments/new"
          className="rounded-[12px] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#1a1508] shadow-lg shadow-black/25 transition hover:brightness-110"
        >
          New assessment
        </Link>
      </div>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-black/20 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Questions</th>
              <th className="px-4 py-3 font-medium">Delivery</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-b border-[var(--border)]/60 last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--text)]">{a.title}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{a.className}</td>
                <td className="px-4 py-3 tabular-nums">{a.questions?.length ?? 0}</td>
                <td className="px-4 py-3 text-xs capitalize text-[var(--muted)]">
                  {a.deliveryMode || "digital"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <button
                      type="button"
                      onClick={() => togglePublish(a)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.published
                          ? "bg-[var(--success)]/20 text-[var(--success)]"
                          : "bg-[var(--warn)]/20 text-[var(--warn)]"
                      }`}
                    >
                      {a.published ? "Published" : "Draft — hidden from students"}
                    </button>
                    {!a.published ? (
                      <span className="max-w-[14rem] text-[10px] leading-tight text-[var(--muted)]">
                        Click to publish so enrolled students can see this quiz.
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/teacher/assessments/${a.id}`}
                    className="text-[var(--accent)] hover:underline"
                  >
                    Results & analytics
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-[var(--muted)]">
            No assessments yet.{" "}
            <Link href="/teacher/assessments/new" className="text-[var(--accent)] hover:underline">
              Create one
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
