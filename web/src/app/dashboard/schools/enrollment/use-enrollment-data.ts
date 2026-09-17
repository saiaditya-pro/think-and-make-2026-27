import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { School } from "@/lib/types";

export { usePartners, useSchoolDetail, useSchoolsByPartner } from "@/hooks/use-school-lookup";

export function useSaveDraft(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<School>(`/schools/${schoolId}/`, accessToken, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (school) => {
      queryClient.setQueryData(["schools", "detail", schoolId], school);
    },
  });
}

export function useSubmitForm1(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<School>(`/schools/${schoolId}/submit-form1/`, accessToken, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (school) => {
      queryClient.setQueryData(["schools", "detail", schoolId], school);
    },
  });
}

export function useUploadSchoolPhoto(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("entity_type", "school_photo");
      form.append("entity_id", schoolId);
      return apiFetch<{ id: number; file: string; entity_type: string; entity_id: string }>("/files/", accessToken, {
        method: "POST",
        body: form,
      });
    },
  });
}
