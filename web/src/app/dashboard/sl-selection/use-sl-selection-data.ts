import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { Paginated, SLSelection } from "@/lib/types";

export function useSLSelectionsForGradeSection(schoolId: string, grade: string, section: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ["sl-selections", "by-grade-section", schoolId, grade, section],
    queryFn: () =>
      apiFetch<Paginated<SLSelection>>(
        `/sl-selections/?school=${schoolId}&grade=${grade}&section=${encodeURIComponent(section)}`,
        accessToken,
      ),
    enabled: !!accessToken && !!schoolId && !!grade && !!section.trim(),
  });
}

export function useBulkSubmitSLSelections(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<SLSelection[]>("/sl-selections/bulk-submit/", accessToken, {
        method: "POST",
        body: JSON.stringify({ ...payload, school: Number(schoolId) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sl-selections", "by-grade-section", schoolId] });
    },
  });
}
