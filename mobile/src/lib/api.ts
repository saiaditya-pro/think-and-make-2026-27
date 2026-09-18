export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}`);
  }
}

type AuthFetch = (path: string, init?: RequestInit) => Promise<Response>;

/** Wraps `useAuth().authFetch`, throwing `ApiError` on non-2xx responses (mirrors the web app's apiFetch contract). */
export async function apiFetch<T>(authFetch: AuthFetch, path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
