import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { Paginated, Partner, School } from "@/lib/types";

export function usePartners() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ["partners"],
    queryFn: () => apiFetch<Paginated<Partner>>("/partners/", accessToken),
    enabled: !!accessToken,
  });
}

export function useSchoolsByPartner(partnerId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ["schools", "by-partner", partnerId],
    queryFn: () => apiFetch<Paginated<School>>(`/schools/?instance__partner=${partnerId}`, accessToken),
    enabled: !!accessToken && !!partnerId,
  });
}

export function useSchoolDetail(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ["schools", "detail", schoolId],
    queryFn: () => apiFetch<School>(`/schools/${schoolId}/`, accessToken),
    enabled: !!accessToken && !!schoolId,
  });
}
