import { supabase } from "./client";
import { getCharacterBags, findAnyPocketWithRoom, removeItemFromPocket } from "./bags";

export interface BagOfHoldingEntry {
  id: string;
  catalogItemId: string;
  name: string;
  category: string;
  imageUrl: string | null;
  baseWeightKg: number;
  gridWidth: number;
  gridHeight: number;
  quantity: number;
  droppedByCharacterId: string | null;
  droppedByCharacterName: string | null;
  isClaimableByPlayers: boolean;
  droppedAt: string;
}

/** Tip: every item currently sitting in this campaign's Bag of Holding — RLS already limits this to campaign members, so no extra filter needed beyond the query itself. */
export async function listBagOfHolding(campaignId: string): Promise<BagOfHoldingEntry[]> {
  const { data, error } = await supabase
    .from("bag_of_holding")
    .select(
      "id, quantity, is_claimable_by_players, dropped_at, " +
        "catalogItem:items_catalog(id, name, category, image_url, base_weight_kg, grid_width, grid_height), " +
        "droppedBy:characters!bag_of_holding_dropped_by_character_id_fkey(id, name)"
    )
    .eq("campaign_id", campaignId)
    .order("dropped_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    catalogItemId: row.catalogItem.id,
    name: row.catalogItem.name,
    category: row.catalogItem.category,
    imageUrl: row.catalogItem.image_url,
    baseWeightKg: row.catalogItem.base_weight_kg,
    gridWidth: row.catalogItem.grid_width,
    gridHeight: row.catalogItem.grid_height,
    quantity: row.quantity,
    droppedByCharacterId: row.droppedBy?.id ?? null,
    droppedByCharacterName: row.droppedBy?.name ?? null,
    isClaimableByPlayers: row.is_claimable_by_players,
    droppedAt: row.dropped_at,
  }));
}

/**
 * Tip: the "Drop" action's real implementation, per spec Module 4 — an
 * item a character drops is never destroyed, it moves to the campaign's
 * Bag of Holding for the DM to redistribute. Not claimable by default;
 * the DM decides what players can pick back up.
 */
export async function dropItemToBagOfHolding(
  campaignId: string,
  characterId: string,
  characterItemId: string
): Promise<void> {
  const { data: itemRow, error: itemError } = await supabase
    .from("character_items")
    .select("catalog_item_id, quantity")
    .eq("id", characterItemId)
    .single();
  if (itemError) throw itemError;

  const { error: insertError } = await supabase.from("bag_of_holding").insert({
    campaign_id: campaignId,
    catalog_item_id: itemRow.catalog_item_id,
    quantity: itemRow.quantity,
    dropped_by_character_id: characterId,
    is_claimable_by_players: false,
  });
  if (insertError) throw insertError;

  await removeItemFromPocket(characterItemId);
}

/** Tip: the DM manually spawning loot — a boss's drops, a treasure chest, anything not tied to a player dropping something. */
export async function addLootToBagOfHolding(campaignId: string, catalogItemId: string, quantity: number): Promise<void> {
  const { error } = await supabase.from("bag_of_holding").insert({
    campaign_id: campaignId,
    catalog_item_id: catalogItemId,
    quantity,
    is_claimable_by_players: true,
  });
  if (error) throw error;
}

/** Tip: DM toggles whether the party can see/claim a given entry — lets a DM stage loot before revealing it. */
export async function setClaimable(entryId: string, isClaimable: boolean): Promise<void> {
  const { error } = await supabase.from("bag_of_holding").update({ is_claimable_by_players: isClaimable }).eq("id", entryId);
  if (error) throw error;
}

/** Tip: DM permanently discards an entry (rather than a player claiming it). */
export async function deleteBagOfHoldingEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from("bag_of_holding").delete().eq("id", entryId);
  if (error) throw error;
}

/**
 * Tip: a player claiming loot onto one of their own characters. Finds
 * room the same way unequipping does (findAnyPocketWithRoom in
 * bags.ts) and throws if there's nowhere for it to go, rather than
 * claiming it into limbo. The RLS policy on bag_of_holding's UPDATE
 * already double-checks server-side that the claiming character
 * belongs to the calling user — this function isn't the only thing
 * standing between a player and claiming loot onto someone else's
 * character.
 */
export async function claimItem(
  entryId: string,
  characterId: string,
  campaignId: string,
  catalogItemId: string,
  gridWidth: number,
  gridHeight: number
): Promise<void> {
  const bags = await getCharacterBags(characterId);
  const destination = findAnyPocketWithRoom(bags, gridWidth, gridHeight);

  if (!destination) {
    throw new Error("No room in any of your bags to claim this item — free up space first.");
  }

  const { error: insertError } = await supabase.from("character_items").insert({
    character_id: characterId,
    catalog_item_id: catalogItemId,
    character_bag_id: destination.characterBagId,
    pocket_template_id: destination.pocketTemplateId,
    grid_x: destination.gridX,
    grid_y: destination.gridY,
    slot_index: destination.slotIndex,
    quantity: 1,
  });
  if (insertError) throw insertError;

  // Claiming updates the Bag of Holding row to mark it claimed rather
  // than deleting it outright — the campaign_id/catalog_item_id here
  // satisfy the RLS policy's WITH CHECK, which requires the update to
  // still name a real campaign and item, not just any row shape.
  //
  // .select().single() is doing real work here, not just fetching data
  // back: without it, an update that RLS silently blocks (e.g. someone
  // else claimed this entry a moment ago, or the DM revoked it) returns
  // no error at all — Postgres just reports "0 rows updated" and
  // Supabase doesn't treat that as a failure on its own. Forcing exactly
  // one row back turns that silent no-op into a real thrown error.
  const { error: updateError } = await supabase
    .from("bag_of_holding")
    .update({ claimed_by_character_id: characterId, is_claimable_by_players: false })
    .eq("id", entryId)
    .eq("campaign_id", campaignId)
    .eq("catalog_item_id", catalogItemId)
    .eq("is_claimable_by_players", true)
    .select()
    .single();
  if (updateError) {
    throw new Error("This item is no longer available to claim — someone may have already claimed it.");
  }
}
