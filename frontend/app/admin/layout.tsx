"use client";

import { AdminShell } from "@/components/AdminShell";
import { RequireRole } from "@/components/RequireRole";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="admin">
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
