import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { ReportsSummary } from "@/lib/types";

export function useReportsSummary() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ["reports", "summary"],
    queryFn: () => apiFetch<ReportsSummary>("/reports/summary/", accessToken),
    enabled: !!accessToken,
  });
}
