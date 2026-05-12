"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiForm } from "@/lib/api";

function PaperUploadInner() {
  const search = useSearchParams();
  const token = search.get("token") || "";
  const { user, ready } = useAuth();
  const router = useRouter();
  const [sheetInfo, setSheetInfo] = useState<{ assessmentTitle: string; studentName: string } | null>(
    null
  );
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${base}/api/public/sheet-token/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setSheetInfo({ assessmentTitle: d.assessmentTitle, studentName: d.studentName });
        else setError(d.message || "Invalid sheet");
      })
      .catch(() => setError("Could not verify sheet"));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/student/paper-upload?token=${token}`)}`);
      return;
    }
    if (!file || !token) {
      setError("Choose a photo of your answer sheet");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("image", file);
      await apiForm<{ message: string }>("/api/student/paper/upload", fd);
      setMsg("Uploaded. Your teacher will validate and post your score.");
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-secondary)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-2xl font-semibold text-[var(--text)]">Upload paper sheet</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Photograph your completed bubble sheet, then submit. Use good lighting and keep the page
        flat.
      </p>
      {!token ? (
        <p className="mt-6 text-[var(--error)]">Missing token. Scan the QR on your printed sheet.</p>
      ) : null}
      {sheetInfo ? (
        <div className="mt-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <p>
            <strong className="text-[var(--text)]">{sheetInfo.assessmentTitle}</strong>
          </p>
          <p className="mt-1 text-[var(--muted)]">Student: {sheetInfo.studentName}</p>
        </div>
      ) : null}
      {!user ? (
        <p className="mt-6 text-sm text-[var(--warn)]">
          <Link
            href={`/login?next=${encodeURIComponent(`/student/paper-upload?token=${token}`)}`}
            className="text-[var(--accent-text)] hover:underline"
          >
            Sign in
          </Link>{" "}
          with the student account that matches this sheet.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
        {msg ? <p className="text-sm text-[var(--success)]">{msg}</p> : null}
        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-secondary)]">Photo (JPEG / PNG)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-[var(--text-secondary)]"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !token || !user}
          className="rounded-[12px] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[#1a1508] disabled:opacity-50"
        >
          {loading ? "Uploading…" : "Submit scan"}
        </button>
      </form>
      <Link
        href="/student/assessments"
        className="mt-10 block text-sm text-[var(--muted)] hover:text-[var(--text)]"
      >
        ← Back to assessments
      </Link>
    </div>
  );
}

export default function StudentPaperUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[var(--text-secondary)]">
          Loading…
        </div>
      }
    >
      <PaperUploadInner />
    </Suspense>
  );
}
