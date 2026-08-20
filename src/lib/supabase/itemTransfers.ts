import { supabase } from "./client";
import { getCharacterBags, findAnyPocketWithRoom } from "./bags";

/**
 * Tip: a DM has full write access to any character's items (see the
 * character_items RLS policy), so giving is a single immediate move —
 * no request needed. A player does NOT have write access to another
 * player's character_items (the RLS policy's WITH CHECK on UPDATE
 * requires owns_character on the row being written), so this function
 * genuinely only works when the caller is the DM — a player calling it
 * against someone else's character gets rejected by Postgres, not just
 * discouraged by the UI. That split is what forces players through
 * createTransferRequest below instead.
 */
export async function giveItemDirectly(
  toCharacterId: string,
  characterItemId: string,
  itemGridWidth: number,
  itemGridHeight: number
): Promise<void> {
  const bags = await getCharacterBags(toCharacterId);
  const destination = findAnyPocketWithRoom(bags, itemGridWidth, itemGridHeight);

  if (!destination) {
    throw new Error("The recipient has no room for this item in any of their bags.");
  }

  const { error } = await supabase
    .from("character_items")
    .update({
      character_id: toCharacterId,
      character_bag_id: destination.characterBagId,
      pocket_template_id: destination.pocketTemplateId,
      grid_x: destination.gridX,
      grid_y: destination.gridY,
      slot_index: destination.slotIndex,
      is_equipped: false,
      equipped_slot: null,
    })
    .eq("id", characterItemId);
  if (error) throw error;
}

/**
 * Tip: the player-to-player path — per spec Module 4, an async request
 * ledger rather than a direct write, since a player can't write to
 * another player's sheet. This only creates the pending record; nothing
 * moves until the recipient calls acceptTransferRequest below. Notice
 * this references catalog_item_id + quantity, not a specific placed
 * item instance — the sender might rearrange or stack their inventory
 * between requesting and the recipient accepting, so acceptance
 * re-checks "does the sender still have enough of this" at that point
 * rather than assuming the exact instance requested is still there.
 */
export async function createTransferRequest(
  fromCharacterId: string,
  toCharacterId: string,
  catalogItemId: string,
  quantity: number
): Promise<void> {
  const { error } = await supabase.from("item_transfers").insert({
    from_character_id: fromCharacterId,
    to_character_id: toCharacterId,
    catalog_item_id: catalogItemId,
    quantity,
  });
  if (error) throw error;
}

export interface PendingTransfer {
  id: string;
  fromCharacterId: string;
  fromCharacterName: string;
  catalogItemId: string;
  itemName: string;
  itemGridWidth: number;
  itemGridHeight: number;
  quantity: number;
  requestedAt: string;
}

/** Tip: incoming pending requests for one character — this is what the "Pending Transfers" section on the sheet renders for the recipient to accept or decline. */
export async function listPendingTransfersForCharacter(characterId: string): Promise<PendingTransfer[]> {
  const { data, error } = await supabase
    .from("item_transfers")
    .select(
      "id, from_character_id, quantity, requested_at, " +
        "fromCharacter:characters!item_transfers_from_character_id_fkey(name), " +
        "catalogItem:items_catalog(id, name, grid_width, grid_height)"
    )
    .eq("to_character_id", characterId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    fromCharacterId: row.from_character_id,
    fromCharacterName: row.fromCharacter.name,
    catalogItemId: row.catalogItem.id,
    itemName: row.catalogItem.name,
    itemGridWidth: row.catalogItem.grid_width,
    itemGridHeight: row.catalogItem.grid_height,
    quantity: row.quantity,
    requestedAt: row.requested_at,
  }));
}

/**
 * Tip: accepting re-verifies the sender actually still has enough of
 * the item (see createTransferRequest's note on why), pulls it from
 * wherever it's sitting in the sender's bags, and finds room for it in
 * the recipient's bags the same way every other placement in this app
 * does. Throws a clear, specific error for either failure mode instead
 * of a generic one, since "they don't have it anymore" and "you have no
 * room" call for different next steps from the player reading it.
 */
export async function acceptTransferRequest(
  transferId: string,
  fromCharacterId: string,
  toCharacterId: string,
  catalogItemId: string,
  quantity: number,
  itemGridWidth: number,
  itemGridHeight: number
): Promise<void> {
  const { data: senderItems, error: senderError } = await supabase
    .from("character_items")
    .select("id, quantity")
    .eq("character_id", fromCharacterId)
    .eq("catalog_item_id", catalogItemId)
    .order("quantity", { ascending: false });
  if (senderError) throw senderError;

  const totalAvailable = (senderItems ?? []).reduce((sum, row) => sum + row.quantity, 0);
  if (totalAvailable < quantity) {
    throw new Error("The sender no longer has enough of this item — the request can't be fulfilled.");
  }

  const recipientBags = await getCharacterBags(toCharacterId);
  const destination = findAnyPocketWithRoom(recipientBags, itemGridWidth, itemGridHeight);
  if (!destination) {
    throw new Error("You have no room for this item in any of your bags.");
  }

  // Pull `quantity` units off the sender's stack(s), largest first, before
  // giving anything to the recipient — if this half fails partway there's
  // no risk of the item existing in both inventories at once.
  let remainingToRemove = quantity;
  for (const item of senderItems ?? []) {
    if (remainingToRemove <= 0) break;
    const takeFromThisStack = Math.min(item.quantity, remainingToRemove);
    const newQuantity = item.quantity - takeFromThisStack;

    if (newQuantity > 0) {
      const { error } = await supabase.from("character_items").update({ quantity: newQuantity }).eq("id", item.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("character_items").delete().eq("id", item.id);
      if (error) throw error;
    }
    remainingToRemove -= takeFromThisStack;
  }

  const { error: insertError } = await supabase.from("character_items").insert({
    character_id: toCharacterId,
    catalog_item_id: catalogItemId,
    character_bag_id: destination.characterBagId,
    pocket_template_id: destination.pocketTemplateId,
    grid_x: destination.gridX,
    grid_y: destination.gridY,
    slot_index: destination.slotIndex,
    quantity,
  });
  if (insertError) throw insertError;

  const { error: statusError } = await supabase.from("item_transfers").update({ status: "accepted" }).eq("id", transferId);
  if (statusError) throw statusError;
}

/** Tip: declining just marks the request closed — nothing moves. */
export async function declineTransferRequest(transferId: string): Promise<void> {
  const { error } = await supabase.from("item_transfers").update({ status: "declined" }).eq("id", transferId);
  if (error) throw error;
}
