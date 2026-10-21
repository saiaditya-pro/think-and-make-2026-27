import type { School } from "./types";

/** Every grade the program runs in -- the choices Form 1 offers. */
export const ALL_GRADES = [6, 7, 8, 9];

/**
 * The grades Form 1 recorded for this school. Until Form 1 sets them, every
 * grade is offered so the later forms can still be filled in out of order.
 */
export function parseGradesOffered(school?: School | null): number[] {
  if (!school?.grades_offered) return ALL_GRADES;
  return school.grades_offered
    .split(",")
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}
