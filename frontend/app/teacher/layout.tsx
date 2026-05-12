"use client";

import { AppShell } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="teacher">
      <AppShell role="teacher">{children}</AppShell>
    </RequireRole>
  );
}
