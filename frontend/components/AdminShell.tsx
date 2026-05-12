"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/subjects", label: "Subjects" },
  { href: "/admin/classes", label: "Classes" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-8">
            <Link href="/admin" className="font-display text-lg font-semibold text-[var(--text)]">
              Studio<span className="text-[var(--accent-text)]">Assess</span>
              <span className="ml-2 text-xs font-sans font-normal text-[var(--muted)]">Admin</span>
            </Link>
            <nav className="flex flex-wrap gap-1">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                        : "text-[var(--text-secondary)] hover:bg-black/[0.04] hover:text-[var(--text)]"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-[var(--muted)] sm:inline">{user?.name}</span>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-[10px] border border-[var(--border-strong)] px-3 py-2 font-medium text-[var(--text-secondary)] hover:text-[var(--text)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
