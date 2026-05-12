"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth, type Role, roleHome } from "@/components/AuthProvider";

export default function RegisterPage() {
  const { register, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [adminInvite, setAdminInvite] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace(roleHome(user.role));
    }
  }, [ready, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({
        email,
        password,
        name,
        role,
        adminInvite: role === "admin" ? adminInvite : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
          New workspace
        </p>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Create account
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-[var(--accent-text)] hover:underline">
            Sign in
          </Link>
        </p>

        <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-5">
          {error ? (
            <div className="rounded-[12px] border border-[var(--error)]/35 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]">
              {error}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Full name
            </span>
            <input
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">I am a</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="input-field w-full"
            >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        {role === "admin" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Admin invite code
            </span>
            <input
              required
              value={adminInvite}
              onChange={(e) => setAdminInvite(e.target.value)}
              autoComplete="off"
              placeholder="From server ADMIN_INVITE_SECRET"
              className="input-field w-full"
            />
            <span className="mt-1 block text-xs text-[var(--muted)]">
              Set <code className="text-[var(--text-secondary)]">ADMIN_INVITE_SECRET</code> in the API{" "}
              <code className="text-[var(--text-secondary)]">.env</code> first.
            </span>
          </label>
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
              minLength={6}
              autoComplete="new-password"
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
            {loading ? "Creating…" : "Create account"}
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
