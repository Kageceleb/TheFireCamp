import { useEffect, useState } from "react";
import { listSpells, createSpell, deleteSpell, type SpellOption } from "../../lib/supabase/catalogs";
import { Field, TextInput, NumberInput, TextAreaInput, CheckboxField, SubmitButton } from "../FormControls";

const EMPTY_FORM = {
  name: "",
  baseLevel: 0,
  school: "",
  castingTime: "1 action",
  componentsVsm: "",
  materialComponents: "",
  description: "",
  requiresConcentration: false,
};

/** Tip: the Spells tab — this is the BASE catalog (3rd era, "normal magic" per spec Module 8). Era-specific overrides are a separate feature, not built here. */
export default function SpellsCatalogTab() {
  const [spells, setSpells] = useState<SpellOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setIsLoading(true);
    try {
      setSpells(await listSpells());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.componentsVsm.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createSpell({
        name: form.name.trim(),
        baseLevel: form.baseLevel,
        school: form.school.trim(),
        castingTime: form.castingTime.trim(),
        componentsVsm: form.componentsVsm.trim(),
        materialComponents: form.materialComponents.trim(),
        description: form.description.trim(),
        requiresConcentration: form.requiresConcentration,
      });
      setForm(EMPTY_FORM);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSpell(id);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
        <div className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
          New Spell
        </div>
        <div className="space-y-3">
          <Field label="Name">
            <TextInput value={form.name} onChange={(name) => setForm({ ...form, name })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Level (0 = cantrip)">
              <NumberInput value={form.baseLevel} onChange={(baseLevel) => setForm({ ...form, baseLevel })} min={0} max={9} />
            </Field>
            <Field label="School">
              <TextInput value={form.school} onChange={(school) => setForm({ ...form, school })} placeholder="e.g. Evocation" />
            </Field>
          </div>
          <Field label="Casting time">
            <TextInput value={form.castingTime} onChange={(castingTime) => setForm({ ...form, castingTime })} />
          </Field>
          <Field label="Components (V/S/M)">
            <TextInput
              value={form.componentsVsm}
              onChange={(componentsVsm) => setForm({ ...form, componentsVsm })}
              placeholder="e.g. V, S, M"
            />
          </Field>
          <Field label="Material components (optional)">
            <TextInput
              value={form.materialComponents}
              onChange={(materialComponents) => setForm({ ...form, materialComponents })}
            />
          </Field>
          <Field label="Description">
            <TextAreaInput value={form.description} onChange={(description) => setForm({ ...form, description })} rows={4} />
          </Field>
          <CheckboxField
            label="Requires concentration"
            checked={form.requiresConcentration}
            onChange={(requiresConcentration) => setForm({ ...form, requiresConcentration })}
          />
        </div>
        {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
        <SubmitButton label={isSubmitting ? "Adding…" : "Add Spell"} onClick={handleCreate} disabled={isSubmitting} />
      </div>

      <div className="rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
        <div className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
          Catalog ({spells.length})
        </div>
        {isLoading ? (
          <p className="text-sm" style={{ color: "#8a7d63" }}>
            Loading…
          </p>
        ) : (
          <div className="max-h-[480px] space-y-1.5 overflow-y-auto">
            {spells.map((spell) => (
              <div key={spell.id} className="flex items-center justify-between text-sm">
                <span style={{ color: "#F0C58A" }}>
                  {spell.name}{" "}
                  <span className="text-[11px]" style={{ color: "#5f5947" }}>
                    ({spell.baseLevel === 0 ? "cantrip" : `lvl ${spell.baseLevel}`})
                  </span>
                </span>
                <button onClick={() => handleDelete(spell.id)} className="text-xs" style={{ color: "#d9694f" }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
