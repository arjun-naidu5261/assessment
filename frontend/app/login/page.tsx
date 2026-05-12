"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth, roleHome } from "@/components/AuthProvider";

function LoginInner() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const nextUrl = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) {
      if (nextUrl && nextUrl.startsWith("/")) {
        router.replace(nextUrl);
      } else {
        router.replace(roleHome(user.role));
      }
    }
  }, [ready, user, router, nextUrl]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-[var(--text-secondary)]">
        Loading…
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-14">
      <div className="w-full max-w-[420px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]/90 p-8 shadow-[var(--shadow)] backdrop-blur-md sm:p-10">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-text)]">
          Welcome back
        </p>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          No account?{" "}
          <Link href="/register" className="font-medium text-[var(--accent-text)] hover:underline">
            Register
          </Link>
        </p>

        <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-5">
          {error ? (
            <div className="rounded-[12px] border border-[var(--error)]/35 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]">
              {error}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field w-full"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-[14px] bg-[var(--accent)] py-3.5 text-sm font-semibold text-[#1a1508] shadow-lg shadow-black/30 transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>
      </div>
      <Link
        href="/"
        className="mt-10 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--text-secondary)]"
      >
        ← Back home
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">
          Loading…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
