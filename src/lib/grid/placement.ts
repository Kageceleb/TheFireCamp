import { placementFits } from "./collision";
import type { GridDimensions, PlacedGridItem } from "./gridTypes";

/**
 * Tip: call this when a new item needs a home in a pocket — adding
 * loot from the catalog, or claiming something from the Bag of
 * Holding. Scans left-to-right, top-to-bottom and returns the first
 * position the item's footprint fits in, or null if the pocket is
 * full. Does not mutate anything; the caller decides what to do with
 * the result (write it to the item's gridX/gridY, or show a "no room"
 * message if it's null).
 */
export function findFirstFreeSpot(
  itemWidth: number,
  itemHeight: number,
  pocket: GridDimensions,
  existingItems: readonly PlacedGridItem[]
): { x: number; y: number } | null {
  for (let y = 0; y <= pocket.height - itemHeight; y++) {
    for (let x = 0; x <= pocket.width - itemWidth; x++) {
      const candidate = { x, y, width: itemWidth, height: itemHeight };
      if (placementFits(candidate, pocket, existingItems)) {
        return { x, y };
      }
    }
  }
  return null;
}
