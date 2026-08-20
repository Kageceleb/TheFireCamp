import { supabase } from "./client";

export type JournalVisibility = "public" | "dm_only" | "private_player";

export interface JournalEntry {
  id: string;
  category: string;
  title: string;
  content: string | null;
  visibility: JournalVisibility;
  authorCharacterId: string | null;
  authorCharacterName: string | null;
  createdAt: string;
}

/**
 * Tip: fetches entries for one category in one campaign. RLS already
 * does the actual privacy enforcement (see 0002_rls_policies.sql's
 * journal_entries_select_by_visibility) — a player's query here
 * naturally comes back missing any dm_only rows and any other player's
 * private_player rows, with no filtering logic needed on this side.
 */
export async function listJournalEntries(campaignId: string, category: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, category, title, content, visibility, author_character_id, author:characters(name), created_at")
    .eq("campaign_id", campaignId)
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    visibility: row.visibility,
    authorCharacterId: row.author_character_id,
    authorCharacterName: row.author?.name ?? null,
    createdAt: row.created_at,
  }));
}

export interface NewJournalEntryInput {
  campaignId: string;
  authorCharacterId: string | null;
  category: string;
  title: string;
  content: string;
  visibility: JournalVisibility;
}

/** Tip: creates a journal entry. RLS is what actually stops a player from writing a dm_only entry or authoring one as someone else's character — this function doesn't duplicate that check client-side. */
export async function createJournalEntry(input: NewJournalEntryInput): Promise<void> {
  const { error } = await supabase.from("journal_entries").insert({
    campaign_id: input.campaignId,
    author_character_id: input.authorCharacterId,
    category: input.category,
    title: input.title,
    content: input.content || null,
    visibility: input.visibility,
  });
  if (error) throw error;
}

/** Tip: DM or the entry's own author only — enforced by RLS. */
export async function deleteJournalEntry(id: string): Promise<void> {
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) throw error;
}
