import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Paginated, StudentHeadcount } from "@/lib/types";

export function useHeadcountsForSchool(schoolId: string) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: ["student-headcounts", "by-school", schoolId],
    queryFn: () => apiFetch<Paginated<StudentHeadcount>>(authFetch, `/student-headcounts/?school=${schoolId}`),
    enabled: !!schoolId,
  });
}

export function useCreateHeadcount(schoolId: string) {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<StudentHeadcount>(authFetch, "/student-headcounts/", {
        method: "POST",
        body: JSON.stringify({ ...payload, school: Number(schoolId) }),
      }),
    onSuccess: (headcount) => {
      queryClient.setQueryData<Paginated<StudentHeadcount>>(["student-headcounts", "by-school", schoolId], (old) => {
        const results = old ? [...old.results, headcount] : [headcount];
        return { count: results.length, next: null, previous: null, results };
      });
    },
  });
}

export function useUploadHeadcountFile(schoolId: string) {
  const { authFetch } = useAuth();

  return useMutation({
    mutationFn: async (asset: { uri: string; name: string; mimeType?: string | null }) => {
      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "application/octet-stream",
      } as unknown as Blob);
      form.append("entity_type", "headcount_team_photo");
      form.append("entity_id", schoolId);
      return apiFetch<{ id: number }>(authFetch, "/files/", { method: "POST", body: form });
    },
  });
}
