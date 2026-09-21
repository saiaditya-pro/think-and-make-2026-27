import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ReportsSummary } from "@/lib/types";

export function useReportsSummary() {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: ["reports", "summary"],
    queryFn: () => apiFetch<ReportsSummary>(authFetch, "/reports/summary/"),
  });
}
