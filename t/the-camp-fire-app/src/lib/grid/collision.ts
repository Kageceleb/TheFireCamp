import type { GridDimensions, GridPlacement, PlacedGridItem } from "./gridTypes";

/**
 * Tip: use this to check two footprints against each other directly —
 * e.g. "would the item I'm dragging land on top of this other item."
 * Returns true if the two rectangles share any area at all.
 */
export function placementsOverlap(a: GridPlacement, b: GridPlacement): boolean {
  const aRight = a.x + a.width;
  const aBottom = a.y + a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.height;

  const overlapsHorizontally = a.x < bRight && aRight > b.x;
  const overlapsVertically = a.y < bBottom && aBottom > b.y;

  return overlapsHorizontally && overlapsVertically;
}

/**
 * Tip: this is THE function to call before committing a drag-and-drop
 * move or a new item placement. It checks both "is this placement
 * inside the pocket's bounds" and "does it collide with anything
 * already there," so callers don't have to remember to do both.
 *
 * Pass `ignoreItemId` when checking a move for an item that's already
 * placed in this pocket, so it doesn't collide with its own old spot.
 */
export function placementFits(
  candidate: GridPlacement,
  pocket: GridDimensions,
  existingItems: readonly PlacedGridItem[],
  ignoreItemId: string | null = null
): boolean {
  const isWithinBounds =
    candidate.x >= 0 &&
    candidate.y >= 0 &&
    candidate.x + candidate.width <= pocket.width &&
    candidate.y + candidate.height <= pocket.height;

  if (!isWithinBounds) {
    return false;
  }

  return existingItems
    .filter((item) => item.characterItemId !== ignoreItemId)
    .every((item) => !placementsOverlap(candidate, item));
}
