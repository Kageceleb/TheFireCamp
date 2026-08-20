/**
 * Tip: standard 5e carry capacity is Strength score × 15 lb; converted
 * to kg (spec v5 is metric throughout) that's roughly ×6.8 kg per point
 * of Strength. Deliberately not a stored column on the character —
 * same reasoning as AC and every other derived stat in this module:
 * it's arithmetic on data we already have, not something to keep in
 * sync by hand. This is a WARNING-ONLY threshold (see
 * src/lib/encumbrance/calculateEncumbrance) — nothing here blocks an
 * action, it's purely what the weight bar compares against.
 */
const KG_PER_STRENGTH_POINT = 6.8;

export function calculateCarryCapacityKg(strengthScore: number): number {
  return strengthScore * KG_PER_STRENGTH_POINT;
}
