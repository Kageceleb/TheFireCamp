import { calculateAbilityModifier } from "./abilityModifier";
import type { SkillProficiencyState } from "./types";

/**
 * Tip: this is the one formula behind every skill check AND every
 * saving throw modifier — both are "ability modifier, plus
 * proficiency bonus once if proficient, twice if there's also
 * expertise." Rather than write near-identical functions for skills
 * and saves separately (which would just be the same business rule
 * copy-pasted — see the pragmatic-DRY principle), both call this one.
 *
 * Saving throws never have expertise in 5e, so callers computing a
 * save should simply not pass hasExpertise: true — no separate
 * function needed for that case.
 */
export function calculateModifierWithProficiency(
  abilityScore: number,
  proficiencyBonus: number,
  proficiency: SkillProficiencyState
): number {
  const baseModifier = calculateAbilityModifier(abilityScore);

  if (!proficiency.isProficient) {
    return baseModifier;
  }

  const proficiencyMultiplier = proficiency.hasExpertise ? 2 : 1;
  return baseModifier + proficiencyBonus * proficiencyMultiplier;
}

/** Tip: Initiative is just the Dex modifier — no proficiency involved, so it's its own tiny function rather than a special case bolted onto the shared one above. */
export function calculateInitiative(dexterityScore: number): number {
  return calculateAbilityModifier(dexterityScore);
}

/** Tip: standard 5e passive score formula — 10 plus the relevant modifier (with proficiency, if any). Used for Passive Perception, but works for any passive skill score. */
export function calculatePassiveScore(
  abilityScore: number,
  proficiencyBonus: number,
  proficiency: SkillProficiencyState
): number {
  return 10 + calculateModifierWithProficiency(abilityScore, proficiencyBonus, proficiency);
}
