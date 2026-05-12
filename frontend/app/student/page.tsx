"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function StudentHomePage() {
  const [classes, setClasses] = useState(0);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, a] = await Promise.all([
          api<{ classes: unknown[] }>("/api/student/classes"),
          api<{
            assessments: { submission: { submitted?: boolean } }[];
          }>("/api/student/assessments"),
        ]);
        if (cancelled) return;
        setClasses(c.classes.length);
        const open = a.assessments.filter((x) => !x.submission?.submitted).length;
        setPending(open);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Student overview</h1>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Classes joined</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{classes}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Open assessments</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{pending}</p>
        </div>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-2 font-medium text-[var(--text)]">Get started</h2>
        <p className="mb-6 text-sm text-[var(--muted)]">
          Ask your teacher for the class join code, then open assessments when they are published.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/student/join"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-neutral-900"
          >
            Join a class
          </Link>
          <Link
            href="/student/assessments"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-white/5"
          >
            View assessments
          </Link>
        </div>
      </div>
    </div>
  );
}
