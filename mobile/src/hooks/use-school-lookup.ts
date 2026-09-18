import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { Paginated, Partner, School } from "@/lib/types";

export function usePartners() {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: ["partners"],
    queryFn: () => apiFetch<Paginated<Partner>>(authFetch, "/partners/"),
  });
}

export function useSchoolsByPartner(partnerId: string) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: ["schools", "by-partner", partnerId],
    queryFn: () => apiFetch<Paginated<School>>(authFetch, `/schools/?instance__partner=${partnerId}`),
    enabled: !!partnerId,
  });
}

export function useSchoolDetail(schoolId: string) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: ["schools", "detail", schoolId],
    queryFn: () => apiFetch<School>(authFetch, `/schools/${schoolId}/`),
    enabled: !!schoolId,
  });
}
