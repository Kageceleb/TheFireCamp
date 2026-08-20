import { useEffect, useState } from "react";
import { listJournalEntries, createJournalEntry, deleteJournalEntry, type JournalEntry } from "../../lib/supabase/journal";
import type { CharacterListItem } from "../../lib/supabase/characters";
import { Field, TextInput, TextAreaInput, SubmitButton } from "../FormControls";

interface PersonalNotesTabProps {
  campaignId: string;
  role: "DM" | "PLAYER";
  myCharacters: CharacterListItem[];
}

/**
 * Tip: genuinely different rules from JournalCategoryTab, not just a
 * different category string — every entry here is visibility =
 * 'private_player' (there's no choice to make, that's the whole point
 * of this tab), and authoring one requires owning a character in this
 * campaign, since author_character_id is what the privacy rule actually
 * checks against (see journal_entries_select_by_visibility in
 * 0002_rls_policies.sql) — a note with no author could never be seen
 * again by the person who wrote it.
 *
 * A DM sees every player's private notes here, not just their own (the
 * RLS policy's is_campaign_dm branch doesn't filter by author) — that's
 * spec-correct per Module 7 ("visible strictly to the authoring player
 * AND the DM"), so each entry shows its author's name so a DM can tell
 * whose is whose.
 */
export default function PersonalNotesTab({ campaignId, role, myCharacters }: PersonalNotesTabProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorCharacterId, setAuthorCharacterId] = useState(myCharacters[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setIsLoading(true);
    try {
      setEntries(await listJournalEntries(campaignId, "Personal Notes"));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!title.trim() || !authorCharacterId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createJournalEntry({
        campaignId,
        authorCharacterId,
        category: "Personal Notes",
        title: title.trim(),
        content,
        visibility: "private_player",
      });
      setTitle("");
      setContent("");
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
      {myCharacters.length === 0 ? (
        <p className="text-sm" style={{ color: "#5f5947" }}>
          Create a character in this campaign first — a personal note needs one to be attached to, since that's what
          keeps it private to just you.
        </p>
      ) : (
        <div className="rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
          <div className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
            New Personal Note
          </div>
          <div className="space-y-3">
            {myCharacters.length > 1 && (
              <Field label="As">
                <select
                  value={authorCharacterId}
                  onChange={(event) => setAuthorCharacterId(event.target.value)}
                  className="mt-1 w-full rounded px-3 py-2"
                  style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
                >
                  {myCharacters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Title">
              <TextInput value={title} onChange={setTitle} />
            </Field>
            <Field label="Content">
              <TextAreaInput value={content} onChange={setContent} rows={4} />
            </Field>
          </div>
          {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
          <SubmitButton label={isSubmitting ? "Adding…" : "Add Note"} onClick={handleCreate} disabled={isSubmitting} />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm" style={{ color: "#8a7d63" }}>
          Loading…
        </p>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: "#5f5947" }}>
          {role === "DM" ? "No player has written any personal notes yet." : "Nothing here yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg p-3" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
              <div className="flex items-center justify-between">
                <span style={{ color: "#F0C58A" }}>
                  {entry.title}
                  {role === "DM" && entry.authorCharacterName && (
                    <span className="ml-2 text-[11px]" style={{ color: "#5f5947" }}>
                      ({entry.authorCharacterName})
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
