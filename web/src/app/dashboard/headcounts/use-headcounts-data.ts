import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { Paginated, StudentHeadcount } from "@/lib/types";

export function useHeadcountsForSchool(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ["student-headcounts", "by-school", schoolId],
    queryFn: () => apiFetch<Paginated<StudentHeadcount>>(`/student-headcounts/?school=${schoolId}`, accessToken),
    enabled: !!accessToken && !!schoolId,
  });
}

export function useCreateHeadcount(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<StudentHeadcount>("/student-headcounts/", accessToken, {
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
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("entity_type", "headcount_team_photo");
      form.append("entity_id", schoolId);
      return apiFetch<{ id: number; file: string; entity_type: string; entity_id: string }>("/files/", accessToken, {
        method: "POST",
        body: form,
      });
    },
  });
}
