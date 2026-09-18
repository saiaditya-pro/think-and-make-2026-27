import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Paginated, SLSelection } from "@/lib/types";

export function useSLSelectionsForGradeSection(schoolId: string, grade: string, section: string) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: ["sl-selections", "by-grade-section", schoolId, grade, section],
    queryFn: () =>
      apiFetch<Paginated<SLSelection>>(
        authFetch,
        `/sl-selections/?school=${schoolId}&grade=${grade}&section=${encodeURIComponent(section)}`,
      ),
    enabled: !!schoolId && !!grade && !!section.trim(),
  });
}

export function useBulkSubmitSLSelections(schoolId: string) {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<SLSelection[]>(authFetch, "/sl-selections/bulk-submit/", {
        method: "POST",
        body: JSON.stringify({ ...payload, school: Number(schoolId) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sl-selections", "by-grade-section", schoolId] });
    },
  });
}
