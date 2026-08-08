import { describe, expect, it } from "vitest";
import { placementFits, placementsOverlap } from "../collision";
import { findFirstFreeSpot } from "../placement";
import type { PlacedGridItem } from "../gridTypes";

describe("placementsOverlap", () => {
  it("detects overlapping rectangles", () => {
    const a = { x: 0, y: 0, width: 2, height: 2 };
    const b = { x: 1, y: 1, width: 2, height: 2 };
    expect(placementsOverlap(a, b)).toBe(true);
  });

  it("does not flag adjacent (touching-edge) rectangles as overlapping", () => {
    const a = { x: 0, y: 0, width: 2, height: 2 };
    const b = { x: 2, y: 0, width: 2, height: 2 };
    expect(placementsOverlap(a, b)).toBe(false);
  });
});

describe("placementFits", () => {
  const pocket = { width: 4, height: 4 };

  it("rejects a placement that goes outside the pocket bounds", () => {
    const candidate = { x: 3, y: 0, width: 2, height: 1 };
    expect(placementFits(candidate, pocket, [])).toBe(false);
  });

  it("rejects a placement that collides with an existing item", () => {
    const existing: PlacedGridItem[] = [
      { characterItemId: "sword-1", x: 0, y: 0, width: 1, height: 4 },
    ];
    const candidate = { x: 0, y: 2, width: 2, height: 1 };
    expect(placementFits(candidate, pocket, existing)).toBe(false);
  });

  it("allows a placement that fits cleanly", () => {
    const existing: PlacedGridItem[] = [
      { characterItemId: "sword-1", x: 0, y: 0, width: 1, height: 4 },
    ];
    const candidate = { x: 1, y: 0, width: 2, height: 2 };
    expect(placementFits(candidate, pocket, existing)).toBe(true);
  });

  it("ignores the item's own existing placement when checking a move for that same item", () => {
    const existing: PlacedGridItem[] = [
      { characterItemId: "shield-1", x: 0, y: 0, width: 2, height: 2 },
    ];
    // Moving shield-1 slightly shouldn't collide with itself
    const candidate = { x: 1, y: 0, width: 2, height: 2 };
    expect(placementFits(candidate, pocket, existing, "shield-1")).toBe(true);
  });
});

describe("findFirstFreeSpot", () => {
  it("finds the first open position, scanning left-to-right then top-to-bottom", () => {
    const pocket = { width: 3, height: 2 };
    const existing: PlacedGridItem[] = [
      { characterItemId: "existing-1", x: 0, y: 0, width: 1, height: 1 },
    ];
    const spot = findFirstFreeSpot(1, 1, pocket, existing);
    expect(spot).toEqual({ x: 1, y: 0 });
  });

  it("returns null when nothing fits", () => {
    const pocket = { width: 1, height: 1 };
    const existing: PlacedGridItem[] = [
      { characterItemId: "existing-1", x: 0, y: 0, width: 1, height: 1 },
    ];
    expect(findFirstFreeSpot(1, 1, pocket, existing)).toBeNull();
  });

  it("fits a bedroll (2x6) and a blanket (2x6) side by side in a 4x6 pocket, like the spec example", () => {
    const pocket = { width: 4, height: 6 };
    const bedroll = findFirstFreeSpot(2, 6, pocket, []);
    expect(bedroll).toEqual({ x: 0, y: 0 });

    const bedrollPlaced: PlacedGridItem = { characterItemId: "bedroll", ...bedroll!, width: 2, height: 6 };
    const blanket = findFirstFreeSpot(2, 6, pocket, [bedrollPlaced]);
    expect(blanket).toEqual({ x: 2, y: 0 });
  });
});
