import { describe, expect, it } from "vitest";
import { roomLeftInStack, splitQuantityIntoStacks } from "../stacking";

describe("splitQuantityIntoStacks", () => {
  it("keeps everything in one stack when it fits under the max", () => {
    expect(splitQuantityIntoStacks(5, 20)).toEqual([5]);
  });

  it("splits 25 arrows with a stack size of 20 into two stacks, per the spec example", () => {
    expect(splitQuantityIntoStacks(25, 20)).toEqual([20, 5]);
  });

  it("treats stackSize 1 as one item per stack (non-stacking items)", () => {
    expect(splitQuantityIntoStacks(3, 1)).toEqual([1, 1, 1]);
  });

  it("returns an empty array for zero or negative quantity", () => {
    expect(splitQuantityIntoStacks(0, 20)).toEqual([]);
  });

  it("throws on an invalid stackSize of 0, rather than silently misbehaving", () => {
    expect(() => splitQuantityIntoStacks(5, 0)).toThrow();
  });
});

describe("roomLeftInStack", () => {
  it("reports the remaining room under the max", () => {
    expect(roomLeftInStack(12, 20)).toBe(8);
  });

  it("never reports negative room for an over-full stack", () => {
    expect(roomLeftInStack(25, 20)).toBe(0);
  });
});
