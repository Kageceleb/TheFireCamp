/**
 * Shared types for the grid/pocket packing engine.
 *
 * These mirror the schema (CharacterItem's gridX/gridY/width/height) but
 * are declared independently rather than imported from a generated SDK —
 * this module is pure business logic and shouldn't need a live Data
 * Connect connection to be unit tested.
 */

/** A rectangular footprint placed at a specific position in a grid pocket. */
export interface GridPlacement {
  /** Column of the top-left corner, 0-indexed. */
  x: number;
  /** Row of the top-left corner, 0-indexed. */
  y: number;
  /** Width in slots. */
  width: number;
  /** Height in slots. */
  height: number;
}

/** The size of a grid pocket that placements are checked against. */
export interface GridDimensions {
  width: number;
  height: number;
}

/**
 * A placed item, identified so it can be excluded from its own
 * collision check (an item shouldn't collide with itself while it's
 * being dragged to a new position).
 */
export interface PlacedGridItem extends GridPlacement {
  characterItemId: string;
}
