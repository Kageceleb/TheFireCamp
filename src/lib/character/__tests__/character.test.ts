import { describe, expect, it } from "vitest";
import { calculateAbilityModifier } from "../abilityModifier";
import { calculateProficiencyBonus } from "../proficiencyBonus";
import { calculateInitiative, calculateModifierWithProficiency, calculatePassiveScore } from "../skillModifier";
import { calculateArmorClass } from "../armorClass";
import { calculateCarryCapacityKg } from "../carryCapacity";
import { getAbilityScore } from "../abilityScoreLookup";

describe("calculateAbilityModifier", () => {
  it("matches the standard 5e modifier table", () => {
    expect(calculateAbilityModifier(10)).toBe(0);
    expect(calculateAbilityModifier(20)).toBe(5);
    expect(calculateAbilityModifier(7)).toBe(-2);
    expect(calculateAbilityModifier(8)).toBe(-1);
  });
});

describe("calculateProficiencyBonus", () => {
  it("uses total level across multiclassed entries, not any single class's level", () => {
    // Rogue 5 / Fighter 3 = total level 8 -> +3
    const classes = [{ level: 5 }, { level: 3 }];
    expect(calculateProficiencyBonus(classes)).toBe(3);
  });

  it("matches known breakpoints", () => {
    expect(calculateProficiencyBonus([{ level: 1 }])).toBe(2);
    expect(calculateProficiencyBonus([{ level: 5 }])).toBe(3);
    expect(calculateProficiencyBonus([{ level: 17 }])).toBe(6);
    expect(calculateProficiencyBonus([{ level: 20 }])).toBe(6);
  });
});

describe("calculateModifierWithProficiency", () => {
  it("matches the example character: Dex 20, proficient, level 8 (+3), Sleight of Hand", () => {
    const modifier = calculateModifierWithProficiency(20, 3, {
      isProficient: true,
      hasExpertise: false,
    });
    expect(modifier).toBe(5 + 3); // +5 Dex mod, +3 proficiency
  });

  it("doubles the proficiency bonus when expertise is flagged (Rogue-specific)", () => {
    const modifier = calculateModifierWithProficiency(20, 3, {
      isProficient: true,
      hasExpertise: true,
    });
    expect(modifier).toBe(5 + 3 * 2);
  });

  it("returns just the ability modifier when not proficient", () => {
    const modifier = calculateModifierWithProficiency(10, 3, {
      isProficient: false,
      hasExpertise: false,
    });
    expect(modifier).toBe(0);
  });
});

describe("calculateInitiative and calculatePassiveScore", () => {
  it("initiative is the bare Dex modifier", () => {
    expect(calculateInitiative(20)).toBe(5);
  });

  it("passive score is 10 plus the modifier (with proficiency applied)", () => {
    const passive = calculatePassiveScore(14, 3, { isProficient: true, hasExpertise: false });
    expect(passive).toBe(10 + 2 + 3);
  });
});

describe("calculateArmorClass", () => {
  it("unarmored is 10 + full Dex modifier", () => {
    expect(calculateArmorClass(null, 20)).toBe(15);
  });

  it("light armor applies the full Dex modifier (no cap)", () => {
    const leatherArmor = { baseAc: 11, dexCap: null };
    expect(calculateArmorClass(leatherArmor, 20)).toBe(16);
  });

  it("medium armor caps the applied Dex modifier", () => {
    const halfPlate = { baseAc: 15, dexCap: 2 };
    expect(calculateArmorClass(halfPlate, 20)).toBe(17); // +5 Dex capped to +2
  });

  it("a homebrew item can skip the formula with a flat override", () => {
    const magicRobe = { baseAc: 0, dexCap: null, flatAcOverride: 22 };
    expect(calculateArmorClass(magicRobe, 10)).toBe(22);
  });

  it("a shield adds a flat bonus on top of whatever the base formula produces", () => {
    expect(calculateArmorClass(null, 14, 2)).toBe(14); // 10 + 2 (Dex) + 2 (shield)
    const leatherArmor = { baseAc: 11, dexCap: null };
    expect(calculateArmorClass(leatherArmor, 14, 2)).toBe(15); // 11 + 2 (Dex) + 2 (shield)
  });
});

describe("calculateCarryCapacityKg", () => {
  it("scales linearly with Strength", () => {
    expect(calculateCarryCapacityKg(10)).toBeCloseTo(68);
    expect(calculateCarryCapacityKg(20)).toBeCloseTo(136);
  });
});

describe("getAbilityScore", () => {
  const scores = { strength: 10, dexterity: 20, constitution: 12, intelligence: 14, wisdom: 10, charisma: 16 };

  it("looks up the right score by governing ability name", () => {
    expect(getAbilityScore(scores, "dexterity")).toBe(20);
  });

  it("throws on an unrecognized ability name rather than returning undefined silently", () => {
    expect(() => getAbilityScore(scores, "luck")).toThrow();
  });
});
