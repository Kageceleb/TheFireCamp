import { calculateAbilityModifier } from "./abilityModifier";
import type { ArmorTypeAttributes } from "./types";

/**
 * Tip: call this with the equipped armor's typeAttributes (parsed
 * from ItemCatalogEntry.typeAttributesJson) and the character's Dex
 * score. Handles all three normal 5e cases in one place — no armor
 * (full Dex), light/medium armor (Dex up to a cap), and homebrew items
 * that just want to declare a flat number instead of following the
 * formula at all.
 *
 * Passing armor: null means unarmored — 10 + full Dex modifier, same
 * as the normal 5e base AC.
 */
export function calculateArmorClass(
  armor: ArmorTypeAttributes | null,
  dexterityScore: number
): number {
  const dexModifier = calculateAbilityModifier(dexterityScore);

  if (armor === null) {
    return 10 + dexModifier;
  }

  if (armor.flatAcOverride !== undefined) {
    return armor.flatAcOverride;
  }

  const appliedDexModifier =
    armor.dexCap === null ? dexModifier : Math.min(dexModifier, armor.dexCap);

  return armor.baseAc + appliedDexModifier;
}
