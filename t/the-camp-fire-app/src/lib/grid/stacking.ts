/**
 * Tip: call this whenever a stackable quantity is being added to a
 * pocket (looting arrows, buying potions) to find out how many
 * separate stacks (and therefore separate grid placements) are
 * needed. A stack never exceeds the item's catalog stackSize — asking
 * for 25 arrows with a stackSize of 20 comes back as [20, 5], meaning
 * two separate grid placements are required, not one.
 *
 * stackSize is asserted to be at least 1 here rather than silently
 * clamped, because a stackSize of 0 would be a data error upstream
 * (the catalog schema itself defaults it to 1 and calls out that it's
 * never 0) — surfacing that loudly is more useful than masking it.
 */
export function splitQuantityIntoStacks(quantity: number, stackSize: number): number[] {
  if (stackSize < 1) {
    throw new Error(`stackSize must be at least 1, got ${stackSize}`);
  }
  if (quantity <= 0) {
    return [];
  }

  const stacks: number[] = [];
  let remaining = quantity;
  while (remaining > 0) {
    const thisStack = Math.min(stackSize, remaining);
    stacks.push(thisStack);
    remaining -= thisStack;
  }
  return stacks;
}

/**
 * Tip: use this before adding to an *existing* stack (e.g. picking up
 * one more torch that lands on a torch stack already in the pocket)
 * to find out how many of the new quantity can merge into it versus
 * needing a new stack of their own.
 */
export function roomLeftInStack(currentQuantity: number, stackSize: number): number {
  return Math.max(0, stackSize - currentQuantity);
}
