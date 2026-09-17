import type { School } from "./types";

export function parseGradesOffered(school?: School | null): number[] {
  if (!school?.grades_offered) return [];
  return school.grades_offered
    .split(",")
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}
