import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { School } from "@/lib/types";

export function useSaveEnrollmentDraft(schoolId: string) {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<School>(authFetch, `/schools/${schoolId}/`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: (data) => queryClient.setQueryData(["schools", "detail", schoolId], data),
  });
}

export function useSubmitForm1(schoolId: string) {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<School>(authFetch, `/schools/${schoolId}/submit-form1/`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => queryClient.setQueryData(["schools", "detail", schoolId], data),
  });
}

export function useUploadSchoolPhoto(schoolId: string) {
  const { authFetch } = useAuth();

  return useMutation({
    mutationFn: async ({ uri, mimeType }: { uri: string; mimeType?: string }) => {
      const form = new FormData();
      form.append("file", { uri, name: "school-photo.jpg", type: mimeType ?? "image/jpeg" } as unknown as Blob);
      form.append("entity_type", "school_photo");
      form.append("entity_id", schoolId);
      return apiFetch<{ id: number }>(authFetch, "/files/", { method: "POST", body: form });
    },
  });
}
