const base = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit & { token?: string | null; adminInvite?: string } = {}
): Promise<T> {
  const { token = getStoredToken(), adminInvite, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!headers.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (adminInvite) headers.set("X-Admin-Invite", adminInvite);
  const res = await fetch(`${base()}${path}`, { ...rest, headers });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "message" in data && typeof data.message === "string"
        ? data.message
        : res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

export async function apiForm<T = unknown>(
  path: string,
  formData: FormData,
  init: { token?: string | null } = {}
): Promise<T> {
  const token = init.token ?? getStoredToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${base()}${path}`, { method: "POST", body: formData, headers });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "message" in data && typeof data.message === "string"
        ? data.message
        : res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

/** Binary download (Excel export, etc.) — uses bearer token */
export async function apiDownload(path: string, fallbackFilename = "download"): Promise<void> {
  const token = getStoredToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${base()}${path}`, { headers });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || res.statusText);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  let filename = fallbackFilename;
  const m = cd?.match(/filename="([^"]+)"/);
  if (m?.[1]) filename = m[1];
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
