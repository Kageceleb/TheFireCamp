import { supabase } from "./client";

export interface ClassOption {
  id: string;
  name: string;
  themeColor: string;
  hitDie: number;
}

export interface SkillOption {
  id: string;
  name: string;
  governingAbility: string;
}

/** Tip: populates the class dropdown on character creation. */
export async function listClasses(): Promise<ClassOption[]> {
  const { data, error } = await supabase
    .from("classes_catalog")
    .select("id, name, theme_color, hit_die")
    .order("name");

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    themeColor: row.theme_color,
    hitDie: row.hit_die,
  }));
}

/** Tip: the full skill list every character sheet renders a row per — governingAbility drives which score computes that skill's modifier. */
export async function listSkills(): Promise<SkillOption[]> {
  const { data, error } = await supabase
    .from("skill_definitions")
    .select("id, name, governing_ability")
    .order("name");

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    governingAbility: row.governing_ability,
  }));
}

export interface NewClassInput {
  name: string;
  themeColor: string;
  hitDie: number;
  description: string;
}

/** Tip: adds a new class to the global catalog — DM-only via RLS. */
export async function createClass(input: NewClassInput): Promise<void> {
  const { error } = await supabase.from("classes_catalog").insert({
    name: input.name,
    theme_color: input.themeColor,
    hit_die: input.hitDie,
    description: input.description || null,
  });
  if (error) throw error;
}

/** Tip: removes a class from the catalog. Rejected by the database if any character currently has it (same reasoning as deleteCatalogItem in items.ts). */
export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from("classes_catalog").delete().eq("id", id);
  if (error) {
    if (error.message.includes("foreign key")) {
      throw new Error("A character currently has this class and it can't be deleted.");
    }
    throw error;
  }
}

export interface SpellOption {
  id: string;
  name: string;
  baseLevel: number;
  school: string | null;
  castingTime: string;
  componentsVsm: string;
  materialComponents: string | null;
  description: string | null;
  requiresConcentration: boolean;
}

/** Tip: the base spell list (3rd-era "normal magic" per spec Module 8) — era-specific overrides are a separate feature, not built yet. */
export async function listSpells(): Promise<SpellOption[]> {
  const { data, error } = await supabase
    .from("spells_catalog")
    .select("id, name, base_level, school, casting_time, components_vsm, material_components, description, requires_concentration")
    .order("base_level")
    .order("name");

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    baseLevel: row.base_level,
    school: row.school,
    castingTime: row.casting_time,
    componentsVsm: row.components_vsm,
    materialComponents: row.material_components,
    description: row.description,
    requiresConcentration: row.requires_concentration,
  }));
}

export interface NewSpellInput {
  name: string;
  baseLevel: number;
  school: string;
  castingTime: string;
  componentsVsm: string;
  materialComponents: string;
  description: string;
  requiresConcentration: boolean;
}

/** Tip: adds a new spell to the base catalog — DM-only via RLS. */
export async function createSpell(input: NewSpellInput): Promise<void> {
  const { error } = await supabase.from("spells_catalog").insert({
    name: input.name,
    base_level: input.baseLevel,
    school: input.school || null,
    casting_time: input.castingTime,
    components_vsm: input.componentsVsm,
    material_components: input.materialComponents || null,
    description: input.description || null,
    requires_concentration: input.requiresConcentration,
  });
  if (error) throw error;
}

/** Tip: removes a spell from the catalog. Rejected by the database if any character currently knows/has prepared it. */
export async function deleteSpell(id: string): Promise<void> {
  const { error } = await supabase.from("spells_catalog").delete().eq("id", id);
  if (error) {
    if (error.message.includes("foreign key")) {
      throw new Error("A character currently knows or has prepared this spell and it can't be deleted.");
    }
    throw error;
  }
}
