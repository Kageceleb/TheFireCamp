import type { CharacterClassLevel } from "./types";

/**
 * Tip: standard 5e proficiency bonus by total character level. Kept
 * as an explicit table rather than a formula (like Math.ceil(level/4)+1)
 * — that formula happens to produce the same breakpoints, but writing
 * the actual table is what "readable over clever" means in practice:
 * anyone can compare this to the Player's Handbook at a glance.
 */
const PROFICIENCY_BONUS_BY_LEVEL: readonly number[] = [
  2, 2, 2, 2, // levels 1-4
  3, 3, 3, 3, // levels 5-8
  4, 4, 4, 4, // levels 9-12
  5, 5, 5, 5, // levels 13-16
  6, 6, 6, 6, // levels 17-20
];

/**
 * Tip: pass every CharacterClass row for the character (multiclass
 * means several rows) — this sums the levels itself, since
 * proficiency bonus is always driven by TOTAL level, never any single
 * class's level.
 */
export function calculateProficiencyBonus(classes: readonly CharacterClassLevel[]): number {
  const totalLevel = classes.reduce((sum, entry) => sum + entry.level, 0);
  const clampedLevel = Math.min(Math.max(totalLevel, 1), PROFICIENCY_BONUS_BY_LEVEL.length);
  return PROFICIENCY_BONUS_BY_LEVEL[clampedLevel - 1] as number;
}
