import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { listClasses, type ClassOption } from "../lib/supabase/catalogs";
import { createCharacter, type NewCharacterClassInput } from "../lib/supabase/characters";
import type { AbilityScores } from "../lib/character/types";

const DEFAULT_SCORES: AbilityScores = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

interface CreateCharacterScreenProps {
  campaignId: string;
  onCreated: () => void;
  onCancel: () => void;
}

/** Tip: plain manual fields throughout, per spec — no ability-score generator, no auto-computed HP. The character sheet (once this saves) is where computed stats show up. */
export default function CreateCharacterScreen({ campaignId, onCreated, onCancel }: CreateCharacterScreenProps) {
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [background, setBackground] = useState("");
  const [hpMax, setHpMax] = useState(10);
  const [speedMeters, setSpeedMeters] = useState(9);
  const [scores, setScores] = useState<AbilityScores>(DEFAULT_SCORES);
  const [classes, setClasses] = useState<NewCharacterClassInput[]>([{ classId: "", subclass: "", level: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    listClasses().then(setClassOptions).catch((error: Error) => setErrorMessage(error.message));
  }, []);

  function updateScore(ability: keyof AbilityScores, value: number) {
    setScores((previous) => ({ ...previous, [ability]: value }));
  }

  function updateClassRow(index: number, patch: Partial<NewCharacterClassInput>) {
    setClasses((previous) => previous.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addClassRow() {
    setClasses((previous) => [...previous, { classId: "", subclass: "", level: 1 }]);
  }

  function removeClassRow(index: number) {
    setClasses((previous) => previous.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!name.trim() || !race.trim() || classes.some((entry) => !entry.classId)) {
      setErrorMessage("Name, race, and a class for every row are required.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createCharacter({
        campaignId,
        name: name.trim(),
        race: race.trim(),
        background: background.trim(),
        hpMax,
        speedMeters,
        abilityScores: scores,
        classes,
      });
      onCreated();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <button onClick={onCancel} className="mb-4 text-sm" style={{ color: "#a89a7d" }}>
        ← Cancel
      </button>
      <h2 className="mb-4 text-xl" style={{ fontFamily: "Cinzel, serif", color: "#F0C58A" }}>
        New Character
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><TextInput value={name} onChange={setName} /></Field>
          <Field label="Race"><TextInput value={race} onChange={setRace} /></Field>
        </div>
        <Field label="Background (optional)"><TextInput value={background} onChange={setBackground} /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="HP Max">
            <NumberInput value={hpMax} onChange={setHpMax} min={1} />
          </Field>
          <Field label="Speed (meters)">
            <NumberInput value={speedMeters} onChange={setSpeedMeters} min={0} step={0.5} />
          </Field>
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
            Ability Scores
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {(Object.keys(scores) as (keyof AbilityScores)[]).map((ability) => (
              <div key={ability}>
                <label className="text-[10px] uppercase tracking-widest" style={{ color: "#5f5947" }}>
                  {ability.slice(0, 3)}
                </label>
                <NumberInput value={scores[ability]} onChange={(value) => updateScore(ability, value)} min={1} max={30} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
              Classes
            </span>
            <button onClick={addClassRow} className="text-xs" style={{ color: "#E2A052" }}>
              + Add class (multiclass)
            </button>
          </div>
          <div className="space-y-2">
            {classes.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={row.classId}
                  onChange={(event) => updateClassRow(index, { classId: event.target.value })}
                  className="flex-1 rounded px-2 py-1.5 text-sm"
                  style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
                >
                  <option value="">Choose class…</option>
                  {classOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <input
                  value={row.subclass}
                  onChange={(event) => updateClassRow(index, { subclass: event.target.value })}
                  placeholder="Subclass (optional)"
                  className="flex-1 rounded px-2 py-1.5 text-sm"
                  style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={row.level}
                  onChange={(event) => updateClassRow(index, { level: Number(event.target.value) })}
                  className="w-16 rounded px-2 py-1.5 text-sm"
                  style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
                />
                {classes.length > 1 && (
                  <button onClick={() => removeClassRow(index)} className="text-sm" style={{ color: "#B3492F" }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full rounded py-2.5 font-semibold text-[#121110] disabled:opacity-60"
          style={{ background: "#E2A052" }}
        >
          {isSubmitting ? "Creating…" : "Create Character"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded px-3 py-2 outline-none"
      style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full rounded px-3 py-2 outline-none"
      style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
    />
  );
}
