import { ApiError } from "./api";

export function apiErrorMessage(err: unknown): string | undefined {
  if (err instanceof ApiError) {
    const body = err.body;
    if (Array.isArray(body) && body.length) return String(body[0]);
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if ("detail" in record) return String(record.detail);
      const firstKey = Object.keys(record)[0];
      if (firstKey) {
        const val = record[firstKey];
        return Array.isArray(val) ? String(val[0]) : String(val);
      }
    }
  }
  return undefined;
}
