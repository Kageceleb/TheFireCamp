import { describe, expect, it } from "vitest";
import { calculateEncumbrance } from "../calculateEncumbrance";
import type { WeighableBag } from "../encumbranceTypes";

describe("calculateEncumbrance", () => {
  it("sums equipped items and a mundane bag's own weight plus its contents", () => {
    const equipped = [{ unitWeightKg: 3, quantity: 1 }]; // e.g. a sword
    const bag: WeighableBag = {
      bagOwnWeightKg: 2,
      isWeightless: false,
      bonusCapacityKg: 0,
      items: [{ unitWeightKg: 0.5, quantity: 4 }], // 4 rations
    };

    const result = calculateEncumbrance(equipped, [bag], 50);
    // 3 (sword) + 2 (bag itself) + 2 (4 * 0.5 rations) = 7
    expect(result.totalWeightKg).toBe(7);
    expect(result.isOverEncumbered).toBe(false);
  });

  it("flags over-encumbered as a warning without throwing or blocking", () => {
    const bag: WeighableBag = {
      bagOwnWeightKg: 1,
      isWeightless: false,
      bonusCapacityKg: 0,
      items: [{ unitWeightKg: 60, quantity: 1 }],
    };
    const result = calculateEncumbrance([], [bag], 50);
    expect(result.isOverEncumbered).toBe(true);
    expect(result.totalWeightKg).toBe(61);
  });

  it("a weightless bag still counts its own weight, but none of its contents", () => {
    const bag: WeighableBag = {
      bagOwnWeightKg: 1.5,
      isWeightless: true,
      bonusCapacityKg: 0,
      items: [{ unitWeightKg: 100, quantity: 3 }], // would be 300kg if it counted
    };
    const result = calculateEncumbrance([], [bag], 50);
    expect(result.totalWeightKg).toBe(1.5);
    expect(result.isOverEncumbered).toBe(false);
  });

  it("a bonus-capacity bag discounts contents but isn't unlimited", () => {
    const bag: WeighableBag = {
      bagOwnWeightKg: 2,
      isWeightless: false,
      bonusCapacityKg: 100,
      items: [{ unitWeightKg: 40, quantity: 1 }], // 40kg of contents, well under the 100kg bonus
    };
    const result = calculateEncumbrance([], [bag], 50);
    // contents (40) - bonus (100) floors at 0, so only the bag's own weight counts
    expect(result.totalWeightKg).toBe(2);

    const heavierBag: WeighableBag = { ...bag, items: [{ unitWeightKg: 150, quantity: 1 }] };
    const heavierResult = calculateEncumbrance([], [heavierBag], 50);
    // 150kg of contents - 100kg bonus = 50kg still counts, plus the bag's own 2kg
    expect(heavierResult.totalWeightKg).toBe(52);
  });
});
