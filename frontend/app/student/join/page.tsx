"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function StudentJoinPage() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const r = await api<{ class: { name: string }; alreadyMember?: boolean }>(
        "/api/student/classes/join",
        {
          method: "POST",
          body: JSON.stringify({ joinCode: code }),
        }
      );
      setMessage(
        r.alreadyMember
          ? `You are already in ${r.class.name}.`
          : `Joined ${r.class.name} successfully.`
      );
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Join a class</h1>
      <form
        onSubmit={onSubmit}
        className="max-w-md space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <p className="text-sm text-[var(--muted)]">
          Enter the join code your teacher shared (letters and numbers).
        </p>
        {error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-lg border border-[var(--success)]/40 bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
            {message}
          </div>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Join code</span>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3D4"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono outline-none focus:border-[var(--accent)]"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {loading ? "Joining…" : "Join class"}
        </button>
      </form>
    </div>
  );
}
