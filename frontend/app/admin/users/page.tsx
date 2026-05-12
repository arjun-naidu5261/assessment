"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Role } from "@/components/AuthProvider";

type Row = { id: string; email: string; name: string; role: Role };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "student" as Role });

  const load = useCallback(async () => {
    const r = await api<{ users: Row[] }>("/api/admin/users");
    setUsers(r.users);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  const filtered = q.trim()
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(q.trim().toLowerCase()) ||
          u.name.toLowerCase().includes(q.trim().toLowerCase())
      )
    : users;

  async function patchRole(id: string, role: Role) {
    setError("");
    try {
      await api(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ email: "", password: "", name: "", role: "student" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Users</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Teachers, students, and administrators.</p>
      </header>
      {error ? <p className="mb-4 text-[var(--error)]">{error}</p> : null}

      <form
        onSubmit={createUser}
        className="mb-10 grid gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:grid-cols-2 lg:grid-cols-5"
      >
        <h2 className="font-display text-lg font-semibold text-[var(--text)] sm:col-span-full">
          Create user
        </h2>
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input-field"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="input-field"
        />
        <input
          required
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="input-field"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          className="input-field"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={creating}
          className="rounded-[12px] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#1a1508] disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <div className="mb-4">
        <input
          placeholder="Search name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input-field max-w-md"
        />
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-black/25 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border)]/60">
                <td className="px-4 py-3 text-[var(--text)]">{u.name}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => patchRole(u.id, e.target.value as Role)}
                    className="input-field py-1 text-sm"
                  >
                    <option value="student">student</option>
                    <option value="teacher">teacher</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
