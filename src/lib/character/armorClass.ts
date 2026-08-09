import { calculateAbilityModifier } from "./abilityModifier";
import type { ArmorTypeAttributes } from "./types";

/**
 * Tip: call this with the Torso slot's equipped armor typeAttributes
 * (parsed from ItemCatalogEntry.typeAttributesJson) and the character's
 * Dex score. Handles all three normal 5e cases in one place — no armor
 * (full Dex), light/medium armor (Dex up to a cap), and homebrew items
 * that just want to declare a flat number instead of following the
 * formula at all.
 *
 * shieldBonus is a separate, optional third input rather than its own
 * function — an equipped shield doesn't replace or get capped by
 * anything, it's a flat addition on top of whatever the Torso slot
 * produces, so it's still fundamentally "the one number AC calculation,"
 * not a second calculation the caller has to remember to add in.
 *
 * Passing armor: null means unarmored — 10 + full Dex modifier, same
 * as the normal 5e base AC.
 */
export function calculateArmorClass(
  armor: ArmorTypeAttributes | null,
  dexterityScore: number,
  shieldBonus = 0
): number {
  const dexModifier = calculateAbilityModifier(dexterityScore);

  if (armor === null) {
    return 10 + dexModifier + shieldBonus;
  }

  if (armor.flatAcOverride !== undefined) {
    return armor.flatAcOverride + shieldBonus;
  }

  const appliedDexModifier =
    armor.dexCap === null ? dexModifier : Math.min(dexModifier, armor.dexCap);

  return armor.baseAc + appliedDexModifier + shieldBonus;
}
