"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/cn";

const teacherLinks = [
  { href: "/teacher", label: "Overview" },
  { href: "/teacher/classes", label: "Classes" },
  { href: "/teacher/questions", label: "Question bank" },
  { href: "/teacher/assessments", label: "Assessments" },
  { href: "/teacher/profile", label: "Profile" },
];

const studentLinks = [
  { href: "/student", label: "Overview" },
  { href: "/student/join", label: "Join class" },
  { href: "/student/assessments", label: "Assessments" },
  { href: "/student/profile", label: "Profile" },
];

function initials(name: string) {
  const p = name.trim().split(/\s+/).slice(0, 2);
  return p.map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}

export function AppShell({
  role,
  children,
}: {
  role: "teacher" | "student";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const links = role === "teacher" ? teacherLinks : studentLinks;

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-8">
            <Link
              href={`/${role}`}
              className="font-display text-lg font-semibold tracking-tight text-[var(--text)]"
            >
              Studio<span className="text-[var(--accent-text)]">Assess</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-1">
              {links.map((l) => {
                const base = `/${role}`;
                const active =
                  l.href === base
                    ? pathname === base
                    : pathname === l.href || pathname.startsWith(`${l.href}/`);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                        : "text-[var(--text-secondary)] hover:bg-black/[0.04] hover:text-[var(--text)]"
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface)]/80 py-1 pl-1 pr-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent-muted)] font-display text-sm font-semibold text-neutral-900"
                aria-hidden
              >
                {user ? initials(user.name) : "…"}
              </span>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="truncate text-sm font-medium leading-tight text-[var(--text)]">
                  {user?.name}
                </p>
                <p className="truncate text-xs capitalize text-[var(--muted)]">{user?.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-[10px] border border-[var(--border-strong)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
