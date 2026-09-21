import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Paginated, School } from "@/lib/types";

export function useSchoolsList() {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: ["schools", "list"],
    queryFn: () => apiFetch<Paginated<School>>(authFetch, "/schools/"),
  });
}
