/**
 * One stack of items sitting in a pocket somewhere, reduced to just
 * the numbers weight calculation needs. Deliberately not the full
 * CharacterItem shape from the schema — this module shouldn't need to
 * know about grid position, equip state, etc. to do its one job.
 */
export interface WeighableItemStack {
  unitWeightKg: number;
  quantity: number;
}

/**
 * One bag a character is carrying, reduced the same way — just what
 * weight calculation needs: the bag's own container weight, its
 * magic properties (if any), and the items inside it.
 */
export interface WeighableBag {
  bagOwnWeightKg: number;
  /** Magic property: everything inside stops counting entirely. */
  isWeightless: boolean;
  /** Magic property: a flat kg discount on this bag's contents (not unlimited). */
  bonusCapacityKg: number;
  items: WeighableItemStack[];
}

export interface EncumbranceResult {
  totalWeightKg: number;
  maxWeightKg: number;
  isOverEncumbered: boolean;
}
