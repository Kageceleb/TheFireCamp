export type AbilityName =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

export interface AbilityScores extends Record<AbilityName, number> {}

/** One class entry from a (possibly multiclassed) character's CharacterClass rows. */
export interface CharacterClassLevel {
  level: number;
}

/** Per-character state for one skill — the skill's name/ability lives in SkillDefinition, not here. */
export interface SkillProficiencyState {
  isProficient: boolean;
  hasExpertise: boolean;
}

/** The pieces of armor data this module needs, out of ItemCatalogEntry.typeAttributesJson. */
export interface ArmorTypeAttributes {
  baseAc: number;
  /** Null means no cap — Dex bonus applies in full (light armor / no armor). */
  dexCap: number | null;
  /** A homebrew item can skip the normal formula entirely with a flat AC. */
  flatAcOverride?: number;
}
