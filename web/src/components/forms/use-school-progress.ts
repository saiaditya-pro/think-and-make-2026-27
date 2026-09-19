import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "@/lib/api";
import type { SchoolProgress } from "@/lib/types";

export function useSchoolProgress(schoolId: string) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ["schools", "progress", schoolId],
    queryFn: () => apiFetch<SchoolProgress>(`/schools/${schoolId}/progress/`, accessToken),
    enabled: !!accessToken && !!schoolId,
  });
}
