import { supabase } from "./client";
import { findFirstFreeSpot } from "../grid/placement";
import type { PlacedGridItem } from "../grid/gridTypes";
import { getCharacterBags } from "./bags";

export interface EquippedItem {
  characterItemId: string;
  catalogItemId: string;
  name: string;
  category: string;
  equippedSlot: string;
  // Parsed JSON from items_catalog.type_attributes — shape varies by
  // category (armor carries baseAc/dexCap, a shield carries
  // shieldBonus), so this stays loosely typed here; the caller (the
  // character sheet's AC calculation) is what interprets it.
  typeAttributes: Record<string, unknown> | null;
}

// Slots that can only hold one item at a time — equipping a second item
// into one of these swaps out whatever was there first. Neck and Rings
// genuinely hold two each in 5e; treating them as single-capacity here
// too is a deliberate simplification for this session (YAGNI) — real
// multi-item slot capacity is a small enough addition to make later
// without touching this shape.
const SINGLE_CAPACITY_SLOTS = new Set([
  "Head", "Torso", "Cloak", "Hands", "Feet", "Neck", "Rings", "Belt", "MainHand", "OffHand",
]);

/** Tip: every currently-equipped item for this character — feeds the Equipment panel and AC calculation. */
export async function listEquippedItems(characterId: string): Promise<EquippedItem[]> {
  const { data, error } = await supabase
    .from("character_items")
    .select("id, equipped_slot, catalogItem:items_catalog(id, name, category, type_attributes)")
    .eq("character_id", characterId)
    .eq("is_equipped", true);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    characterItemId: row.id,
    catalogItemId: row.catalogItem.id,
    name: row.catalogItem.name,
    category: row.catalogItem.category,
    equippedSlot: row.equipped_slot,
    typeAttributes: row.catalogItem.type_attributes,
  }));
}

/**
 * Tip: equips an item into a body slot, pulling it out of whatever
 * pocket it was sitting in — equipped and stored are mutually exclusive
 * per spec Module 3, so this clears the item's grid/slot placement
 * entirely. If the slot only holds one item and something's already
 * there, that occupant is unequipped back into a pocket first — a swap,
 * not a rejected action.
 */
export async function equipItem(characterId: string, characterItemId: string, slot: string): Promise<void> {
  if (SINGLE_CAPACITY_SLOTS.has(slot)) {
    const { data: occupant, error: occupantError } = await supabase
      .from("character_items")
      .select("id")
      .eq("character_id", characterId)
      .eq("equipped_slot", slot)
      .eq("is_equipped", true)
      .maybeSingle();
    if (occupantError) throw occupantError;
    if (occupant) {
      await unequipItem(characterId, occupant.id);
    }
  }

  const { error } = await supabase
    .from("character_items")
    .update({
      is_equipped: true,
      equipped_slot: slot,
      character_bag_id: null,
      pocket_template_id: null,
      grid_x: null,
      grid_y: null,
      slot_index: null,
    })
    .eq("id", characterItemId);
  if (error) throw error;
}

/**
 * Tip: unequips an item and finds it a home in whichever carried
 * pocket has room — same "first fit wins" search as adding a brand new
 * item (addItemToPocket in bags.ts). Throws rather than silently
 * leaving the item nowhere — if nothing fits, the caller needs to know
 * so the player can free up space first.
 */
export async function unequipItem(characterId: string, characterItemId: string): Promise<void> {
  const { data: itemRow, error: itemError } = await supabase
    .from("character_items")
    .select("catalogItem:items_catalog(grid_width, grid_height)")
    .eq("id", characterItemId)
    .single();
  if (itemError) throw itemError;

  const itemWidth = (itemRow as any).catalogItem.grid_width;
  const itemHeight = (itemRow as any).catalogItem.grid_height;

  const bags = await getCharacterBags(characterId);

  for (const bag of bags) {
    for (const pocket of bag.pockets) {
      if (pocket.packingType === "GRID") {
        const grid = { width: pocket.gridWidth ?? 0, height: pocket.gridHeight ?? 0 };
        const existingPlacements: PlacedGridItem[] = pocket.items
          .filter((item) => item.gridX !== null && item.gridY !== null)
          .map((item) => ({
            characterItemId: item.characterItemId,
            x: item.gridX as number,
            y: item.gridY as number,
            width: item.gridWidth,
            height: item.gridHeight,
          }));

        const spot = findFirstFreeSpot(itemWidth, itemHeight, grid, existingPlacements);
        if (spot) {
          const { error } = await supabase
            .from("character_items")
            .update({
              is_equipped: false,
              equipped_slot: null,
              character_bag_id: bag.characterBagId,
              pocket_template_id: pocket.pocketTemplateId,
              grid_x: spot.x,
              grid_y: spot.y,
              slot_index: null,
            })
            .eq("id", characterItemId);
          if (error) throw error;
          return;
        }
      } else {
        const usedSlots = new Set(pocket.items.map((item) => item.slotIndex));
        const maxSlots = pocket.slotCount ?? 0;
        for (let slotIndex = 0; slotIndex < maxSlots; slotIndex++) {
          if (!usedSlots.has(slotIndex)) {
            const { error } = await supabase
              .from("character_items")
              .update({
                is_equipped: false,
                equipped_slot: null,
                character_bag_id: bag.characterBagId,
                pocket_template_id: pocket.pocketTemplateId,
                grid_x: null,
                grid_y: null,
                slot_index: slotIndex,
              })
              .eq("id", characterItemId);
            if (error) throw error;
            return;
          }
        }
      }
    }
  }

  throw new Error("No room in any bag to unequip this item — free up space first.");
}
