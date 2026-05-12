"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/cn";

export default function StudentProfilePage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  async function saveIdentity(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      await updateProfile({ name });
      setMsg({ type: "ok", text: "Profile updated." });
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Could not save",
      });
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMsg({ type: "ok", text: "Password changed." });
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Could not update password",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-10">
        <p className="font-display text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent-text)]">
          Account
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Profile
        </h1>
        <p className="mt-2 max-w-lg text-[var(--text-secondary)]">
          Your name appears on submissions and results.
        </p>
      </div>

      {msg ? (
        <div
          className={cn(
            "mb-8 rounded-[var(--radius)] border px-4 py-3 text-sm",
            msg.type === "ok"
              ? "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]"
              : "border-[var(--error)]/40 bg-[var(--error)]/10 text-[var(--error)]"
          )}
        >
          {msg.text}
        </div>
      ) : null}

      <section className="mb-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Your details</h2>
        <form onSubmit={saveIdentity} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Display name
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Email
            </span>
            <input
              disabled
              value={user?.email ?? ""}
              className="input-field w-full cursor-not-allowed opacity-70"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-[12px] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[#1a1508] shadow-lg shadow-black/20 transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Password</h2>
        <form onSubmit={savePassword} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Current password
            </span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field w-full"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              New password
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              className="input-field w-full"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Confirm new password
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field w-full"
            />
          </label>
          <button
            type="submit"
            disabled={
              loading ||
              !newPassword ||
              !currentPassword ||
              newPassword !== confirmPassword
            }
            className="rounded-[12px] border border-[var(--border-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-white/[0.04] disabled:opacity-40"
          >
            Update password
          </button>
        </form>
      </section>
    </div>
  );
}
