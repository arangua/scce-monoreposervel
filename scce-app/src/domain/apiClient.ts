// scce-app/src/domain/apiClient.ts
import { API_BASE_URL } from "../config/runtime";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

async function safeJson(res: Response): Promise<unknown> {
  const txt = await res.text();
  try { return txt ? JSON.parse(txt) : null; } catch { return txt; }
}

export async function apiRequest<T>(
  path: string,
  opts: {
    method?: string;
    token?: string | null;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResult<T>> {
  const method = opts.method ?? (opts.body ? "POST" : "GET");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers ?? {}),
  };

  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo conectar al servidor." };
  }

  const payload = await safeJson(res);

  if (!res.ok) {
    const msg =
      (payload && (payload.message || payload.error)) ||
      `Error HTTP ${res.status}`;
    return { ok: false, error: String(msg), status: res.status };
  }

  return { ok: true, data: payload as T };
}
