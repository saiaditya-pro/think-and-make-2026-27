import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { School } from "@/lib/types";

export function useSubmitForm2(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<School>(`/schools/${schoolId}/submit-form2/`, accessToken, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (school) => {
      queryClient.setQueryData(["schools", "detail", schoolId], school);
    },
  });
}
