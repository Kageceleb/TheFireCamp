import { useEffect, useState } from "react";
import { listJournalEntries, createJournalEntry, deleteJournalEntry, type JournalEntry } from "../../lib/supabase/journal";
import { Field, TextInput, TextAreaInput, CheckboxField, SubmitButton } from "../FormControls";

interface JournalCategoryTabProps {
  campaignId: string;
  category: string;
  role: "DM" | "PLAYER";
  authorCharacterId: string | null;
}

/**
 * Tip: one component covers Quests, NPCs, World Codex, and Locations —
 * same shape every time (a title, some content, and whether it's
 * DM-only), just a different category string per tab. Personal Notes
 * gets its own component instead of reusing this one, since its rules
 * are genuinely different (no visibility choice, requires an authoring
 * character) rather than just a different category name.
 */
export default function JournalCategoryTab({ campaignId, category, role, authorCharacterId }: JournalCategoryTabProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dmOnly, setDmOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void refresh();
  }, [category]);

  async function refresh() {
    setIsLoading(true);
    try {
      setEntries(await listJournalEntries(campaignId, category));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createJournalEntry({
        campaignId,
        authorCharacterId,
        category,
        title: title.trim(),
        content,
        visibility: dmOnly ? "dm_only" : "public",
      });
      setTitle("");
      setContent("");
      setDmOnly(false);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteJournalEntry(id);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
        <div className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
          New Entry
        </div>
        <div className="space-y-3">
          <Field label="Title">
            <TextInput value={title} onChange={setTitle} />
          </Field>
          <Field label="Content">
            <TextAreaInput value={content} onChange={setContent} rows={4} />
          </Field>
          {role === "DM" && (
            <CheckboxField label="DM only — hidden from players" checked={dmOnly} onChange={setDmOnly} />
          )}
        </div>
        {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
        <SubmitButton label={isSubmitting ? "Adding…" : "Add Entry"} onClick={handleCreate} disabled={isSubmitting} />
      </div>

      {isLoading ? (
        <p className="text-sm" style={{ color: "#8a7d63" }}>
          Loading…
        </p>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: "#5f5947" }}>
          Nothing here yet.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg p-3" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
              <div className="flex items-center justify-between">
                <span style={{ color: "#F0C58A" }}>
                  {entry.title}
                  {entry.visibility === "dm_only" && (
                    <span className="ml-2 text-[11px]" style={{ color: "#5f5947" }}>
                      (DM only)
                    </span>
                  )}
                </span>
                <button onClick={() => handleDelete(entry.id)} className="text-xs" style={{ color: "#d9694f" }}>
                  Delete
                </button>
              </div>
              {entry.content && (
                <p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: "#a89a7d" }}>
                  {entry.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
