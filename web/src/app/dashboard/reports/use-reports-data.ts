import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { ReportsSummary, SyncStatus } from "@/lib/types";

/** `partnerId` narrows rows and KPIs to that partner's schools. */
export function useReportsSummary(partnerId?: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ["reports", "summary", partnerId ?? "all"],
    queryFn: () =>
      apiFetch<ReportsSummary>(
        partnerId ? `/reports/summary/?partner=${encodeURIComponent(partnerId)}` : "/reports/summary/",
        accessToken,
      ),
    enabled: !!accessToken,
  });
}

export function useSyncStatus(enabled: boolean) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ["sync", "status"],
    queryFn: () => apiFetch<SyncStatus>("/sync/status/", accessToken),
    enabled: enabled && !!accessToken,
    // Picks up both scheduled syncs and a queued "Sync now" finishing.
    refetchInterval: 60_000,
  });
}

export function useRunSync() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiFetch<{ queued: boolean }>("/sync/run/", accessToken, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
