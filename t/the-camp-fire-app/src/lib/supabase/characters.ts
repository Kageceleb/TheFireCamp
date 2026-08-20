import { supabase } from "./client";
import type { AbilityScores } from "../character/types";

export interface CharacterListItem {
  id: string;
  name: string;
  race: string;
  hpCurrent: number;
  hpMax: number;
  ownerUserId: string;
}

export interface CharacterClassEntry {
  classId: string;
  className: string;
  themeColor: string;
  subclass: string | null;
  level: number;
}

export interface CharacterSkillState {
  skillId: string;
  skillName: string;
  governingAbility: string;
  isProficient: boolean;
  hasExpertise: boolean;
}

export interface CharacterSheetData {
  id: string;
  name: string;
  race: string;
  background: string | null;
  hpMax: number;
  hpCurrent: number;
  hpTemp: number;
  exhaustion: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  speedMeters: number;
  abilityScores: AbilityScores;
  savingThrowProficiencies: Record<keyof AbilityScores, boolean>;
  classes: CharacterClassEntry[];
  skills: CharacterSkillState[];
}

export interface NewCharacterClassInput {
  classId: string;
  subclass: string;
  level: number;
}

export interface NewCharacterInput {
  campaignId: string;
  name: string;
  race: string;
  background: string;
  hpMax: number;
  speedMeters: number;
  abilityScores: AbilityScores;
  classes: NewCharacterClassInput[];
}

/** Tip: populates the character list inside a campaign — deliberately light (no stats), the full sheet loads separately only once a specific character is opened. Includes ownerUserId so the UI can tell whether the signed-in player owns each character, for edit permissions. */
export async function listCharactersForCampaign(campaignId: string): Promise<CharacterListItem[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("id, name, race, hp_current, hp_max, user_id")
    .eq("campaign_id", campaignId)
    .order("name");

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    race: row.race,
    hpCurrent: row.hp_current,
    hpMax: row.hp_max,
    ownerUserId: row.user_id,
  }));
}

/**
 * Tip: loads everything the character sheet needs to render in one
 * call — the character row itself, its classes (joined with
 * classes_catalog for the display name/theme), and its skills (joined
 * with skill_definitions). Three queries run together rather than the
 * UI making them one at a time and juggling three loading states.
 */
export async function getCharacterSheet(characterId: string): Promise<CharacterSheetData> {
  const [characterResult, classesResult, skillsResult] = await Promise.all([
    supabase.from("characters").select("*").eq("id", characterId).single(),
    supabase
      .from("character_classes")
      .select("class_id, subclass, level, classEntry:classes_catalog(name, theme_color)")
      .eq("character_id", characterId),
    supabase
      .from("character_skills")
      .select("is_proficient, has_expertise, skill:skill_definitions(id, name, governing_ability)")
      .eq("character_id", characterId),
  ]);

  if (characterResult.error) throw characterResult.error;
  if (classesResult.error) throw classesResult.error;
  if (skillsResult.error) throw skillsResult.error;

  const character = characterResult.data;

  return {
    id: character.id,
    name: character.name,
    race: character.race,
    background: character.background,
    hpMax: character.hp_max,
    hpCurrent: character.hp_current,
    hpTemp: character.hp_temp,
    exhaustion: character.exhaustion,
    deathSaveSuccesses: character.death_save_successes,
    deathSaveFailures: character.death_save_failures,
    speedMeters: character.speed_meters,
    abilityScores: {
      strength: character.strength_score,
      dexterity: character.dexterity_score,
      constitution: character.constitution_score,
      intelligence: character.intelligence_score,
      wisdom: character.wisdom_score,
      charisma: character.charisma_score,
    },
    savingThrowProficiencies: {
      strength: character.strength_save_proficient,
      dexterity: character.dexterity_save_proficient,
      constitution: character.constitution_save_proficient,
      intelligence: character.intelligence_save_proficient,
      wisdom: character.wisdom_save_proficient,
      charisma: character.charisma_save_proficient,
    },
    classes: classesResult.data.map((row) => ({
      classId: row.class_id,
      className: row.classEntry.name,
      themeColor: row.classEntry.theme_color,
      subclass: row.subclass,
      level: row.level,
    })),
    skills: skillsResult.data.map((row) => ({
      skillId: row.skill.id,
      skillName: row.skill.name,
      governingAbility: row.skill.governing_ability,
      isProficient: row.is_proficient,
      hasExpertise: row.has_expertise,
    })),
  };
}

/**
 * Tip: creates a character and its class rows together. Not wrapped in
 * a database function like campaign creation was — there's no
 * chicken-and-egg RLS problem here (the character row's own RLS check
 * is "did I just insert this as myself," which is already true), so a
 * plain two-step client call is simple enough (KISS: only reach for a
 * database function when there's an actual reason to, not by default).
 */
export async function createCharacter(input: NewCharacterInput): Promise<string> {
  const { data: character, error: characterError } = await supabase
    .from("characters")
    .insert({
      campaign_id: input.campaignId,
      name: input.name,
      race: input.race,
      background: input.background || null,
      hp_max: input.hpMax,
      hp_current: input.hpMax,
      speed_meters: input.speedMeters,
      strength_score: input.abilityScores.strength,
      dexterity_score: input.abilityScores.dexterity,
      constitution_score: input.abilityScores.constitution,
      intelligence_score: input.abilityScores.intelligence,
      wisdom_score: input.abilityScores.wisdom,
      charisma_score: input.abilityScores.charisma,
    })
    .select("id")
    .single();

  if (characterError) throw characterError;

  const classRows = input.classes.map((entry) => ({
    character_id: character.id,
    class_id: entry.classId,
    subclass: entry.subclass || null,
    level: entry.level,
  }));

  const { error: classesError } = await supabase.from("character_classes").insert(classRows);
  if (classesError) throw classesError;

  return character.id;
}

/** Tip: the handful of fields a player fiddles with constantly during play — kept as one small update rather than folded into the (much larger) character-creation function. */
export async function updateCharacterVitals(
  characterId: string,
  updates: Partial<{
    hpCurrent: number;
    hpTemp: number;
    exhaustion: number;
    deathSaveSuccesses: number;
    deathSaveFailures: number;
  }>
): Promise<void> {
  const { error } = await supabase
    .from("characters")
    .update({
      hp_current: updates.hpCurrent,
      hp_temp: updates.hpTemp,
      exhaustion: updates.exhaustion,
      death_save_successes: updates.deathSaveSuccesses,
      death_save_failures: updates.deathSaveFailures,
    })
    .eq("id", characterId);

  if (error) throw error;
}

/** Tip: upsert rather than update, since a character might not have a character_skills row for this skill yet — this is the first time it's being set. */
export async function setSkillProficiency(
  characterId: string,
  skillId: string,
  isProficient: boolean,
  hasExpertise: boolean
): Promise<void> {
  const { error } = await supabase
    .from("character_skills")
    .upsert(
      { character_id: characterId, skill_id: skillId, is_proficient: isProficient, has_expertise: hasExpertise },
      { onConflict: "character_id,skill_id" }
    );

  if (error) throw error;
}
