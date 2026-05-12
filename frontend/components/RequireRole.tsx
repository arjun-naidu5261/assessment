"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth, type Role, roleHome } from "./AuthProvider";

export function RequireRole({
  role,
  children,
}: {
  role: Role | Role[];
  children: ReactNode;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const roleKey = Array.isArray(role) ? role.join(",") : role;

  useEffect(() => {
    const allowed: Role[] = Array.isArray(role) ? role : [role];
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowed.includes(user.role)) {
      router.replace(roleHome(user.role));
    }
  }, [ready, user, router, roleKey, role]);

  const allowed: Role[] = Array.isArray(role) ? role : [role];
  if (!ready || !user || !allowed.includes(user.role)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-display text-[var(--text-secondary)]">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
