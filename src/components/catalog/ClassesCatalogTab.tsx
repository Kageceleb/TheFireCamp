import { useEffect, useState } from "react";
import { listClasses, createClass, deleteClass, type ClassOption } from "../../lib/supabase/catalogs";
import { Field, TextInput, NumberInput, TextAreaInput, SubmitButton } from "../FormControls";

const EMPTY_FORM = {
  name: "",
  themeColor: "#E2A052",
  hitDie: 8,
  description: "",
};

/** Tip: the Classes tab — themeColor drives the class-specific accent used in the sheet's visual identity (spec Module 10); hitDie is stored but HP itself stays a manual field on character creation, same reasoning as always (multiclass means no single predictable hit die per character). */
export default function ClassesCatalogTab() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
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
      setClasses(await listClasses());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createClass({
        name: form.name.trim(),
        themeColor: form.themeColor,
        hitDie: form.hitDie,
        description: form.description.trim(),
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
      await deleteClass(id);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
        <div className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
          New Class
        </div>
        <div className="space-y-3">
          <Field label="Name">
            <TextInput value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="e.g. Artificer" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hit die">
              <NumberInput value={form.hitDie} onChange={(hitDie) => setForm({ ...form, hitDie })} min={4} max={12} step={2} />
            </Field>
            <Field label="Theme color">
              <input
                type="color"
                value={form.themeColor}
                onChange={(event) => setForm({ ...form, themeColor: event.target.value })}
                className="mt-1 h-[38px] w-full rounded"
                style={{ border: "1px solid #3D2B1D" }}
              />
            </Field>
          </div>
          <Field label="Description (optional)">
            <TextAreaInput value={form.description} onChange={(description) => setForm({ ...form, description })} />
          </Field>
        </div>
        {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
        <SubmitButton label={isSubmitting ? "Adding…" : "Add Class"} onClick={handleCreate} disabled={isSubmitting} />
      </div>

      <div className="rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
        <div className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
          Catalog ({classes.length})
        </div>
        {isLoading ? (
          <p className="text-sm" style={{ color: "#8a7d63" }}>
            Loading…
          </p>
        ) : (
          <div className="max-h-[480px] space-y-1.5 overflow-y-auto">
            {classes.map((classOption) => (
              <div key={classOption.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2" style={{ color: "#F0C58A" }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: classOption.themeColor }} />
                  {classOption.name} <span className="text-[11px]" style={{ color: "#5f5947" }}>(d{classOption.hitDie})</span>
                </span>
                <button onClick={() => handleDelete(classOption.id)} className="text-xs" style={{ color: "#d9694f" }}>
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
