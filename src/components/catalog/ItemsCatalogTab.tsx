import { useEffect, useState } from "react";
import { listCatalogItems, createCatalogItem, deleteCatalogItem, type CatalogItem } from "../../lib/supabase/items";
import { Field, TextInput, NumberInput, TextAreaInput, SubmitButton } from "../FormControls";

const EMPTY_FORM = {
  name: "",
  category: "",
  description: "",
  baseWeightKg: 1,
  stackSize: 1,
  gridWidth: 1,
  gridHeight: 1,
  validSlots: "", // comma-separated in the form, split into an array on submit
  imageUrl: "",
  typeAttributesJson: "", // freeform — see the field's own note for why
};

/**
 * Tip: the Items tab of the DM catalog screen. The one intentionally
 * "advanced" field here is typeAttributesJson — armor, weapons, and
 * whatever homebrew categories a DM invents all need different shaped
 * data (baseAc+dexCap, a damage die, a shieldBonus...), and building a
 * dynamic form generator for that is a lot of machinery for a field DMs
 * will touch occasionally. A raw JSON textarea is the pragmatic choice;
 * it already matches how these values are stored (items_catalog.type_attributes
 * is jsonb) and how calculateArmorClass reads them back out.
 */
export default function ItemsCatalogTab() {
  const [items, setItems] = useState<CatalogItem[]>([]);
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
      setItems(await listCatalogItems());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.category.trim()) return;

    let typeAttributes: Record<string, unknown> | null = null;
    if (form.typeAttributesJson.trim()) {
      try {
        typeAttributes = JSON.parse(form.typeAttributesJson);
      } catch {
        setErrorMessage("Type attributes isn't valid JSON — check for a stray comma or missing quote.");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createCatalogItem({
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        baseWeightKg: form.baseWeightKg,
        stackSize: form.stackSize,
        gridWidth: form.gridWidth,
        gridHeight: form.gridHeight,
        validSlots: form.validSlots
          .split(",")
          .map((slot) => slot.trim())
          .filter((slot) => slot.length > 0),
        imageUrl: form.imageUrl.trim(),
        typeAttributes,
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
      await deleteCatalogItem(id);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
        <div className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
          New Item
        </div>
        <div className="space-y-3">
          <Field label="Name">
            <TextInput value={form.name} onChange={(name) => setForm({ ...form, name })} />
          </Field>
          <Field label="Category">
            <TextInput
              value={form.category}
              onChange={(category) => setForm({ ...form, category })}
              placeholder="e.g. weapon, armor, flask, gear"
            />
          </Field>
          <Field label="Description">
            <TextInput value={form.description} onChange={(description) => setForm({ ...form, description })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight (kg)">
              <NumberInput
                value={form.baseWeightKg}
                onChange={(baseWeightKg) => setForm({ ...form, baseWeightKg })}
                min={0}
                step={0.1}
              />
            </Field>
            <Field label="Stack size">
              <NumberInput value={form.stackSize} onChange={(stackSize) => setForm({ ...form, stackSize })} min={1} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grid width">
              <NumberInput value={form.gridWidth} onChange={(gridWidth) => setForm({ ...form, gridWidth })} min={1} max={6} />
            </Field>
            <Field label="Grid height">
              <NumberInput value={form.gridHeight} onChange={(gridHeight) => setForm({ ...form, gridHeight })} min={1} max={6} />
            </Field>
          </div>
          <Field label="Equip slot(s) — comma-separated, blank if not equippable">
            <TextInput
              value={form.validSlots}
              onChange={(validSlots) => setForm({ ...form, validSlots })}
              placeholder="e.g. Torso, or MainHand"
            />
          </Field>
          <Field label="Image URL (optional)">
            <TextInput value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
          </Field>
          <Field label="Type attributes — optional, raw JSON, e.g. armor: {&quot;baseAc&quot;: 11, &quot;dexCap&quot;: null}">
            <TextAreaInput
              value={form.typeAttributesJson}
              onChange={(typeAttributesJson) => setForm({ ...form, typeAttributesJson })}
              placeholder='{"baseAc": 11, "dexCap": null}'
            />
          </Field>
        </div>
        {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
        <SubmitButton label={isSubmitting ? "Adding…" : "Add Item"} onClick={handleCreate} disabled={isSubmitting} />
      </div>

      <div className="rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
        <div className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
          Catalog ({items.length})
        </div>
        {isLoading ? (
          <p className="text-sm" style={{ color: "#8a7d63" }}>
            Loading…
          </p>
        ) : (
          <div className="max-h-[480px] space-y-1.5 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span style={{ color: "#F0C58A" }}>
                  {item.name} <span className="text-[11px]" style={{ color: "#5f5947" }}>({item.category})</span>
                </span>
                <button onClick={() => handleDelete(item.id)} className="text-xs" style={{ color: "#d9694f" }}>
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
