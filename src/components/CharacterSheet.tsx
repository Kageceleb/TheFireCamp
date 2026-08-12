import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  getCharacterSheet,
  setSkillProficiency,
  updateCharacterVitals,
  type CharacterSheetData,
} from "../lib/supabase/characters";
import { listEquippedItems, type EquippedItem } from "../lib/supabase/equipment";
import { calculateAbilityModifier } from "../lib/character/abilityModifier";
import { calculateProficiencyBonus } from "../lib/character/proficiencyBonus";
import { calculateInitiative, calculateModifierWithProficiency, calculatePassiveScore } from "../lib/character/skillModifier";
import { calculateArmorClass } from "../lib/character/armorClass";
import { calculateCarryCapacityKg } from "../lib/character/carryCapacity";
import { getAbilityScore } from "../lib/character/abilityScoreLookup";
import type { AbilityName } from "../lib/character/types";
import ExhaustionIndicator from "./ExhaustionIndicator";
import DeathSavesIndicator from "./DeathSavesIndicator";
import CharacterEquipmentPanel from "./CharacterEquipmentPanel";
import CharacterBagsPanel from "./bags/CharacterBagsPanel";
import RollButton from "./RollButton";

const ABILITY_LABELS: Record<AbilityName, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

interface CharacterSheetProps {
  characterId: string;
  canEdit: boolean;
  onBack: () => void;
}

/**
 * Tip: this component's job is fetching one character's data and
 * handing it to the math functions from src/lib/character — it doesn't
 * contain any 5e rules itself, just wiring. If a formula is ever wrong,
 * the fix belongs in src/lib/character (and its tests), not here.
 */
export default function CharacterSheet({ characterId, canEdit, onBack }: CharacterSheetProps) {
  const [sheet, setSheet] = useState<CharacterSheetData | null>(null);
  const [equippedItems, setEquippedItems] = useState<EquippedItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Bumped whenever equipment changes, from EITHER the Equipment panel
  // (unequip) or the Bags panel (equip) — both react to it, so they can
  // never drift out of sync with each other.
  const [inventoryVersion, setInventoryVersion] = useState(0);
  const [lastRoll, setLastRoll] = useState<string | null>(null);

  useEffect(() => {
    void loadSheet();
    void loadEquipment();
  }, [characterId]);

  useEffect(() => {
    if (inventoryVersion > 0) void loadEquipment();
  }, [inventoryVersion]);

  async function loadSheet() {
    try {
      setSheet(await getCharacterSheet(characterId));
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function loadEquipment() {
    try {
      setEquippedItems(await listEquippedItems(characterId));
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  function handleInventoryChanged() {
    setInventoryVersion((version) => version + 1);
  }

  /** Tip: builds a "1d20+N" style formula from a modifier — every roll button in this sheet (checks, saves, skills) shares this one formatting rule. */
  function d20Formula(modifier: number): string {
    return `1d20${modifier >= 0 ? "+" : ""}${modifier}`;
  }

  function handleRolled(label: string, total: number) {
    setLastRoll(Number.isNaN(total) ? `${label}: roll failed` : `${label}: ${total}`);
  }

  async function handleVitalsChange(updates: Parameters<typeof updateCharacterVitals>[1]) {
    if (!sheet) return;
    // Optimistic update so pips/HP feel instant; reconciled by loadSheet on failure.
    setSheet({ ...sheet, ...toSheetPatch(updates) });
    try {
      await updateCharacterVitals(characterId, updates);
    } catch (error) {
      setErrorMessage((error as Error).message);
      await loadSheet();
    }
  }

  async function handleSkillToggle(skillId: string, isProficient: boolean, hasExpertise: boolean) {
    if (!sheet) return;
    setSheet({
      ...sheet,
      skills: sheet.skills.map((skill) =>
        skill.skillId === skillId ? { ...skill, isProficient, hasExpertise } : skill
      ),
    });
    try {
      await setSkillProficiency(characterId, skillId, isProficient, hasExpertise);
    } catch (error) {
      setErrorMessage((error as Error).message);
      await loadSheet();
    }
  }

  if (errorMessage) {
    return <p className="text-sm text-red-400">{errorMessage}</p>;
  }
  if (!sheet) {
    return <p className="text-sm" style={{ color: "#8a7d63" }}>Loading character…</p>;
  }

  const proficiencyBonus = calculateProficiencyBonus(sheet.classes);

  // Torso armor drives the base formula; an equipped shield (OffHand)
  // adds a flat bonus on top — see calculateArmorClass's own comment
  // for why those are one calculation, not two.
  const torsoItem = equippedItems.find((item) => item.equippedSlot === "Torso");
  const torsoAttributes = torsoItem?.typeAttributes as
    | { baseAc?: number; dexCap?: number | null; flatAcOverride?: number }
    | null;
  const armorInput =
    torsoAttributes && typeof torsoAttributes.baseAc === "number"
      ? { baseAc: torsoAttributes.baseAc, dexCap: torsoAttributes.dexCap ?? null, flatAcOverride: torsoAttributes.flatAcOverride }
      : null;

  const offHandItem = equippedItems.find((item) => item.equippedSlot === "OffHand");
  const offHandAttributes = offHandItem?.typeAttributes as { shieldBonus?: number } | null;
  const shieldBonus = offHandAttributes?.shieldBonus ?? 0;

  const armorClass = calculateArmorClass(armorInput, sheet.abilityScores.dexterity, shieldBonus);
  const carryCapacityKg = calculateCarryCapacityKg(sheet.abilityScores.strength);
  const initiative = calculateInitiative(sheet.abilityScores.dexterity);
  const perceptionSkill = sheet.skills.find((skill) => skill.skillName === "Perception");
  const passivePerception = calculatePassiveScore(sheet.abilityScores.wisdom, proficiencyBonus, {
    isProficient: perceptionSkill?.isProficient ?? false,
    hasExpertise: perceptionSkill?.hasExpertise ?? false,
  });
  const classSummary = sheet.classes
    .map((entry) => `${entry.className}${entry.subclass ? ` (${entry.subclass})` : ""} ${entry.level}`)
    .join(" / ");

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm" style={{ color: "#a89a7d" }}>
        ← Characters
      </button>

      <div className="mb-6 rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
        <h2 className="text-xl" style={{ fontFamily: "Cinzel, serif", color: "#F0C58A" }}>
          {sheet.name}
        </h2>
        <p className="mb-3 text-sm" style={{ color: "#a89a7d" }}>
          {sheet.race} · {classSummary || "No class yet"}
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-4">
          <VitalStat label="HP" value={`${sheet.hpCurrent} / ${sheet.hpMax}`} />
          <VitalStat label="AC" value={String(armorClass)} />
          <VitalStat
            label="Initiative"
            value={formatModifier(initiative)}
            roll={
              <RollButton
                formula={d20Formula(initiative)}
                label="Initiative"
                characterName={sheet.name}
                onRolled={handleRolled}
              />
            }
          />
          <VitalStat label="Speed" value={`${sheet.speedMeters} m`} />
          <VitalStat label="Passive Perception" value={String(passivePerception)} />
        </div>

        {lastRoll && (
          <div className="mb-3 text-sm" style={{ color: "#E2A052" }}>
            🎲 {lastRoll}
          </div>
        )}

        <ExhaustionIndicator
          level={sheet.exhaustion}
          canEdit={canEdit}
          onChange={(exhaustion) => void handleVitalsChange({ exhaustion })}
        />

        {sheet.hpCurrent <= 0 && (
          <div className="mt-2">
            <DeathSavesIndicator
              successes={sheet.deathSaveSuccesses}
              failures={sheet.deathSaveFailures}
              canEdit={canEdit}
              onChangeSuccesses={(deathSaveSuccesses) => void handleVitalsChange({ deathSaveSuccesses })}
              onChangeFailures={(deathSaveFailures) => void handleVitalsChange({ deathSaveFailures })}
            />
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {(Object.keys(ABILITY_LABELS) as AbilityName[]).map((ability) => {
          const score = sheet.abilityScores[ability];
          const modifier = calculateAbilityModifier(score);
          const isSaveProficient = sheet.savingThrowProficiencies[ability];
          const saveModifier = calculateModifierWithProficiency(score, proficiencyBonus, {
            isProficient: isSaveProficient,
            hasExpertise: false,
          });
          return (
            <div key={ability} className="rounded-lg p-3 text-center" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
              <div className="text-[11px] tracking-widest" style={{ color: "#5f5947" }}>
                {ABILITY_LABELS[ability]}
              </div>
              <div className="text-lg" style={{ color: "#F0C58A" }}>
                {score}
              </div>
              <div className="text-sm" style={{ color: "#a89a7d" }}>
                {formatModifier(modifier)}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: isSaveProficient ? "#E2A052" : "#5f5947" }}>
                save {formatModifier(saveModifier)}
              </div>
              <div className="mt-1.5 flex justify-center gap-2">
                <RollButton
                  formula={d20Formula(modifier)}
                  label={`${ABILITY_LABELS[ability]} check`}
                  characterName={sheet.name}
                  onRolled={handleRolled}
                />
                <RollButton
                  formula={d20Formula(saveModifier)}
                  label={`${ABILITY_LABELS[ability]} save`}
                  characterName={sheet.name}
                  onRolled={handleRolled}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
        <div className="mb-2 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
          Skills (proficiency bonus {formatModifier(proficiencyBonus)})
        </div>
        <div className="space-y-1">
          {sheet.skills.map((skill) => {
            const score = getAbilityScore(sheet.abilityScores, skill.governingAbility);
            const modifier = calculateModifierWithProficiency(score, proficiencyBonus, {
              isProficient: skill.isProficient,
              hasExpertise: skill.hasExpertise,
            });
            return (
              <div key={skill.skillId} className="flex items-center justify-between py-1 text-sm">
                <label className="flex items-center gap-2" style={{ color: "#F0C58A" }}>
                  <input
                    type="checkbox"
                    checked={skill.isProficient}
                    disabled={!canEdit}
                    onChange={(event) => void handleSkillToggle(skill.skillId, event.target.checked, skill.hasExpertise)}
                  />
                  {skill.skillName}
                  <span className="text-[11px]" style={{ color: "#5f5947" }}>
                    ({ABILITY_LABELS[skill.governingAbility as AbilityName]})
                  </span>
                </label>
                <span className="flex items-center gap-2" style={{ color: "#a89a7d" }}>
                  {formatModifier(modifier)}
                  <RollButton
                    formula={d20Formula(modifier)}
                    label={skill.skillName}
                    characterName={sheet.name}
                    onRolled={handleRolled}
                  />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
        <div className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
          Equipment
        </div>
        <CharacterEquipmentPanel
          equippedItems={equippedItems}
          characterId={characterId}
          canEdit={canEdit}
          onChanged={handleInventoryChanged}
        />
      </div>

      <div className="mt-6 rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
        <div className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
          Bags
        </div>
        <CharacterBagsPanel
          characterId={characterId}
          maxWeightKg={carryCapacityKg}
          canEdit={canEdit}
          refreshKey={inventoryVersion}
          onInventoryChanged={handleInventoryChanged}
        />
      </div>
    </div>
  );
}

function VitalStat({ label, value, roll }: { label: string; value: string; roll?: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
        {label}
      </div>
      <div className="flex items-center gap-1.5" style={{ color: "#F0C58A" }}>
        {value}
        {roll}
      </div>
    </div>
  );
}

/** Tip: 5e convention — modifiers always show their sign, even at zero ("+0"), so it visually matches every published character sheet. */
function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : String(modifier);
}

/** Tip: translates the snake-ish partial update shape from updateCharacterVitals into the sheet's own field names, for the optimistic local update. */
function toSheetPatch(updates: Parameters<typeof updateCharacterVitals>[1]): Partial<CharacterSheetData> {
  const patch: Partial<CharacterSheetData> = {};
  if (updates.hpCurrent !== undefined) patch.hpCurrent = updates.hpCurrent;
  if (updates.hpTemp !== undefined) patch.hpTemp = updates.hpTemp;
  if (updates.exhaustion !== undefined) patch.exhaustion = updates.exhaustion;
  if (updates.deathSaveSuccesses !== undefined) patch.deathSaveSuccesses = updates.deathSaveSuccesses;
  if (updates.deathSaveFailures !== undefined) patch.deathSaveFailures = updates.deathSaveFailures;
  return patch;
}
