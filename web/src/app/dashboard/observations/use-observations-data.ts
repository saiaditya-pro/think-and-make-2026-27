import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { Paginated, SessionObservation } from "@/lib/types";

export function useObservationsForSchool(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ["session-observations", "by-school", schoolId],
    queryFn: () =>
      apiFetch<Paginated<SessionObservation>>(`/session-observations/?school=${schoolId}`, accessToken),
    enabled: !!accessToken && !!schoolId,
  });
}

export function useCreateObservation(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<SessionObservation, "id" | "school">) =>
      apiFetch<SessionObservation>("/session-observations/", accessToken, {
        method: "POST",
        body: JSON.stringify({ ...payload, school: Number(schoolId) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-observations", "by-school", schoolId] });
    },
  });
}
