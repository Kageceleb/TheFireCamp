import type { EncumbranceResult, WeighableBag, WeighableItemStack } from "./encumbranceTypes";

/** Tip: small helper — total weight of a flat list of item stacks, no bag involved. */
function sumStackWeights(stacks: readonly WeighableItemStack[]): number {
  return stacks.reduce((total, stack) => total + stack.unitWeightKg * stack.quantity, 0);
}

/**
 * Tip: this is the one function the character sheet's weight bar
 * calls. It totals every equipped item, every bag's own weight, and
 * every item inside every bag — applying each bag's magic properties
 * (weightless contents, or a flat kg discount) as it goes.
 *
 * This is a WARNING-ONLY calculation by design (per spec Module 2 /
 * Module 6) — `isOverEncumbered` is informational. Nothing in this
 * module blocks an action; it's up to the UI to decide how loudly to
 * show the warning, never whether to prevent something.
 */
export function calculateEncumbrance(
  equippedItems: readonly WeighableItemStack[],
  bags: readonly WeighableBag[],
  maxWeightKg: number
): EncumbranceResult {
  const equippedWeight = sumStackWeights(equippedItems);

  const bagsWeight = bags.reduce((total, bag) => {
    if (bag.isWeightless) {
      // Contents don't count at all; only the bag itself still does.
      return total + bag.bagOwnWeightKg;
    }

    const contentsWeight = sumStackWeights(bag.items);
    const discountedContentsWeight = Math.max(0, contentsWeight - bag.bonusCapacityKg);
    return total + bag.bagOwnWeightKg + discountedContentsWeight;
  }, 0);

  const totalWeightKg = equippedWeight + bagsWeight;

  return {
    totalWeightKg,
    maxWeightKg,
    isOverEncumbered: totalWeightKg > maxWeightKg,
  };
}
