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
