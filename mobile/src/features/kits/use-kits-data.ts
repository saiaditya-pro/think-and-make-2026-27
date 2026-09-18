import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { KitDelivery, Paginated } from "@/lib/types";

export function useKitDeliveryForSchool(schoolId: string) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: ["kit-deliveries", "by-school", schoolId],
    queryFn: () => apiFetch<Paginated<KitDelivery>>(authFetch, `/kit-deliveries/?school=${schoolId}`),
    enabled: !!schoolId,
  });
}

export function useSaveKitDelivery(schoolId: string, deliveryId: number | undefined) {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      deliveryId
        ? apiFetch<KitDelivery>(authFetch, `/kit-deliveries/${deliveryId}/`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : apiFetch<KitDelivery>(authFetch, "/kit-deliveries/", {
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
  const { authFetch } = useAuth();

  return useMutation({
    mutationFn: async ({ uri, mimeType, entityType }: { uri: string; mimeType?: string; entityType: string }) => {
      const form = new FormData();
      form.append("file", { uri, name: `${entityType}.jpg`, type: mimeType ?? "image/jpeg" } as unknown as Blob);
      form.append("entity_type", entityType);
      form.append("entity_id", schoolId);
      return apiFetch<{ id: number }>(authFetch, "/files/", { method: "POST", body: form });
    },
  });
}
