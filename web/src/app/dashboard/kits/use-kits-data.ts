import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { KitDelivery, Paginated } from "@/lib/types";

export function useKitDeliveryForSchool(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ["kit-deliveries", "by-school", schoolId],
    queryFn: () => apiFetch<Paginated<KitDelivery>>(`/kit-deliveries/?school=${schoolId}`, accessToken),
    enabled: !!accessToken && !!schoolId,
  });
}

export function useSaveKitDelivery(schoolId: string, deliveryId: number | undefined) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      deliveryId
        ? apiFetch<KitDelivery>(`/kit-deliveries/${deliveryId}/`, accessToken, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : apiFetch<KitDelivery>("/kit-deliveries/", accessToken, {
            method: "POST",
            body: JSON.stringify({ ...payload, school: Number(schoolId) }),
          }),
    onSuccess: (delivery) => {
      queryClient.setQueryData<Paginated<KitDelivery>>(["kit-deliveries", "by-school", schoolId], {
        count: 1,
        next: null,
        previous: null,
        results: [delivery],
      });
    },
  });
}

export function useUploadKitFile(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async ({ file, entityType }: { file: File; entityType: string }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("entity_type", entityType);
      form.append("entity_id", schoolId);
      return apiFetch<{ id: number; file: string; entity_type: string; entity_id: string }>("/files/", accessToken, {
        method: "POST",
        body: form,
      });
    },
  });
}
