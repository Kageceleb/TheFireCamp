/**
 * Tip: the one formula every other derived stat in this module builds
 * on. Standard 5e rounding is "round down," which in JS for negative
 * numbers means Math.floor, not integer division — (score - 10) / 2
 * truncated toward zero would give the wrong answer for odd scores
 * below 10 (e.g. a score of 7 should give -2, not -1).
 */
export function calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
