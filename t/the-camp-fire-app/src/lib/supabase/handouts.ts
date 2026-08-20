import { supabase } from "./client";

export interface Handout {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  category: string;
  isRevealed: boolean;
  createdAt: string;
}

/**
 * Tip: RLS (handouts_select_dm_or_revealed) already filters this to
 * "everything, if you're the DM" or "only revealed ones, if you're a
 * player" — so this same function serves both the DM's staging gallery
 * and a player's reveal-only view, just returning different rows
 * depending on who's asking.
 */
export async function listHandouts(campaignId: string): Promise<Handout[]> {
  const { data, error } = await supabase
    .from("handouts")
    .select("id, title, description, image_url, category, is_revealed, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    category: row.category,
    isRevealed: row.is_revealed,
    createdAt: row.created_at,
  }));
}

export interface NewHandoutInput {
  campaignId: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
}

/**
 * Tip: creates a handout in the DM's staging gallery — image is a
 * pasted URL for now, not an uploaded file. Spec Module 6 calls for
 * DM file uploads compressed client-side to webp too; that's a real
 * follow-up piece (needs Supabase Storage wired up, which nothing in
 * this app uses yet), deliberately not built this session so it isn't
 * a rushed half-version — paste-a-URL matches how every other image
 * field in this app already works (item/category images).
 */
export async function createHandout(input: NewHandoutInput): Promise<void> {
  const { error } = await supabase.from("handouts").insert({
    campaign_id: input.campaignId,
    title: input.title,
    description: input.description || null,
    image_url: input.imageUrl,
    category: input.category || "general",
  });
  if (error) throw error;
}

/**
 * Tip: this is "Broadcast to Party" from spec Module 6, minus the live
 * push — it flips is_revealed so the handout shows up next time a
 * player's gallery loads, same fetch-on-load pattern every other screen
 * in this app already uses (Bag of Holding doesn't push live either).
 * A real-time popup the instant the DM reveals something would need a
 * Supabase Realtime channel subscription, which is a genuinely separate
 * piece of work — not built here, flagging it rather than quietly
 * shipping a partial version of "broadcast."
 */
export async function revealHandout(id: string): Promise<void> {
  const { error } = await supabase.from("handouts").update({ is_revealed: true }).eq("id", id);
  if (error) throw error;
}

/** Tip: DM hides a handout again — undoes revealHandout. */
export async function hideHandout(id: string): Promise<void> {
  const { error } = await supabase.from("handouts").update({ is_revealed: false }).eq("id", id);
  if (error) throw error;
}

/** Tip: DM permanently removes a handout from the gallery. */
export async function deleteHandout(id: string): Promise<void> {
  const { error } = await supabase.from("handouts").delete().eq("id", id);
  if (error) throw error;
}
