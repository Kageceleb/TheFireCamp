import type { AbilityName, AbilityScores } from "./types";

/**
 * Tip: skills/saves store their governing ability as a plain string
 * (e.g. "dexterity") so a DM can add a homebrew skill without a schema
 * change. This is the one place that string gets turned back into an
 * actual score lookup — call it instead of indexing into AbilityScores
 * directly, so there's a single spot to update if that mapping ever
 * needs validation (e.g. an unrecognized ability name from a typo'd
 * homebrew skill).
 */
export function getAbilityScore(scores: AbilityScores, abilityName: string): number {
  const key = abilityName as AbilityName;
  const score = scores[key];
  if (score === undefined) {
    throw new Error(`Unrecognized ability name: "${abilityName}"`);
  }
  return score;
}
