import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { School } from "@/lib/types";

export function useSubmitForm2(schoolId: string) {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<School>(authFetch, `/schools/${schoolId}/submit-form2/`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (school) => {
      queryClient.setQueryData(["schools", "detail", schoolId], school);
    },
  });
}
