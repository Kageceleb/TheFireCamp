import { supabase } from "./client";
import { findFirstFreeSpot } from "../grid/placement";
import { roomLeftInStack, splitQuantityIntoStacks } from "../grid/stacking";
import type { PlacedGridItem } from "../grid/gridTypes";
import type { WeighableBag } from "../encumbrance/encumbranceTypes";
import type { CatalogItem } from "./items";

export interface BagTypeOption {
  id: string;
  name: string;
  bodySlot: string;
}

/** Tip: populates the "Add Bag" picker — every DM-authored bag type available, regardless of campaign. */
export async function listBagTypes(): Promise<BagTypeOption[]> {
  const { data, error } = await supabase.from("bag_types").select("id, name, body_slot").order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, bodySlot: row.body_slot }));
}

export interface PlacedItem {
  characterItemId: string;
  catalogItemId: string;
  name: string;
  category: string;
  imageUrl: string | null;
  baseWeightKg: number;
  stackSize: number;
  quantity: number;
  gridX: number | null;
  gridY: number | null;
  slotIndex: number | null;
  gridWidth: number;
  gridHeight: number;
  // Which body slot(s), if any, this item can be equipped to — empty
  // means it isn't equippable at all (a rope, a ration, a potion).
  validSlots: string[];
}

export interface PocketWithItems {
  pocketTemplateId: string;
  name: string;
  packingType: "GRID" | "UNIFORM_SLOTS";
  gridWidth: number | null;
  gridHeight: number | null;
  slotCount: number | null;
  allowedCategory: string | null;
  items: PlacedItem[];
}

export interface CharacterBagData {
  characterBagId: string;
  bagTypeName: string;
  equippedSlot: string;
  baseWeightKg: number;
  isWeightless: boolean;
  bonusCapacityKg: number;
  pockets: PocketWithItems[];
}

/**
 * Tip: the one function that loads everything the Bags panel needs to
 * render — every bag the character carries, each pocket resolved against
 * any per-character override (resized/removed), and every item placed in
 * each pocket. Three separate queries composed client-side rather than
 * one giant nested query, so each piece (bags+pockets, overrides, items)
 * stays easy to read on its own.
 */
export async function getCharacterBags(characterId: string): Promise<CharacterBagData[]> {
  const { data: bagRows, error: bagError } = await supabase
    .from("character_bags")
    .select(
      "id, equipped_slot, is_weightless, bonus_capacity_kg, " +
        "bagType:bag_types(name, base_weight_kg, pocketTemplates:pocket_templates(" +
        "id, name, packing_type, grid_width, grid_height, slot_count, allowed_category))"
    )
    .eq("character_id", characterId);

  if (bagError) throw bagError;
  if (!bagRows || bagRows.length === 0) return [];

  const bagIds = bagRows.map((row: any) => row.id);

  const { data: overrideRows, error: overrideError } = await supabase
    .from("character_bag_pocket_overrides")
    .select("character_bag_id, pocket_template_id, grid_width, grid_height, slot_count, is_removed")
    .in("character_bag_id", bagIds);
  if (overrideError) throw overrideError;

  const { data: itemRows, error: itemError } = await supabase
    .from("character_items")
    .select(
      "id, character_bag_id, pocket_template_id, grid_x, grid_y, slot_index, quantity, " +
        "catalogItem:items_catalog(id, name, category, image_url, base_weight_kg, stack_size, grid_width, grid_height, valid_slots)"
    )
    .eq("character_id", characterId);
  if (itemError) throw itemError;

  return bagRows.map((bag: any) => {
    const overridesForBag = (overrideRows ?? []).filter((o: any) => o.character_bag_id === bag.id);
    const itemsForBag = (itemRows ?? []).filter((i: any) => i.character_bag_id === bag.id);

    const pockets: PocketWithItems[] = (bag.bagType.pocketTemplates ?? [])
      .map((template: any) => {
        const override = overridesForBag.find((o: any) => o.pocket_template_id === template.id);
        if (override?.is_removed) return null;

        const itemsForPocket: PlacedItem[] = itemsForBag
          .filter((item: any) => item.pocket_template_id === template.id)
          .map((item: any) => ({
            characterItemId: item.id,
            catalogItemId: item.catalogItem.id,
            name: item.catalogItem.name,
            category: item.catalogItem.category,
            imageUrl: item.catalogItem.image_url,
            baseWeightKg: item.catalogItem.base_weight_kg,
            stackSize: item.catalogItem.stack_size,
            quantity: item.quantity,
            gridX: item.grid_x,
            gridY: item.grid_y,
            slotIndex: item.slot_index,
            gridWidth: item.catalogItem.grid_width,
            gridHeight: item.catalogItem.grid_height,
            validSlots: item.catalogItem.valid_slots ?? [],
          }));

        return {
          pocketTemplateId: template.id,
          name: template.name,
          packingType: template.packing_type,
          gridWidth: override?.grid_width ?? template.grid_width,
          gridHeight: override?.grid_height ?? template.grid_height,
          slotCount: override?.slot_count ?? template.slot_count,
          allowedCategory: template.allowed_category,
          items: itemsForPocket,
        };
      })
      .filter((pocket: PocketWithItems | null): pocket is PocketWithItems => pocket !== null);

    return {
      characterBagId: bag.id,
      bagTypeName: bag.bagType.name,
      equippedSlot: bag.equipped_slot,
      baseWeightKg: bag.bagType.base_weight_kg,
      isWeightless: bag.is_weightless,
      bonusCapacityKg: bag.bonus_capacity_kg,
      pockets,
    };
  });
}

/** Tip: assigns a bag type to a character, worn in the given body slot. Starts empty — items are added afterward via addItemToPocket. */
export async function addBagToCharacter(characterId: string, bagTypeId: string, equippedSlot: string): Promise<void> {
  const { error } = await supabase
    .from("character_bags")
    .insert({ character_id: characterId, bag_type_id: bagTypeId, equipped_slot: equippedSlot });
  if (error) throw error;
}

async function insertCharacterItem(input: {
  characterId: string;
  characterBagId: string;
  pocketTemplateId: string;
  catalogItemId: string;
  quantity: number;
  gridX?: number;
  gridY?: number;
  slotIndex?: number;
}): Promise<void> {
  const { error } = await supabase.from("character_items").insert({
    character_id: input.characterId,
    character_bag_id: input.characterBagId,
    pocket_template_id: input.pocketTemplateId,
    catalog_item_id: input.catalogItemId,
    quantity: input.quantity,
    grid_x: input.gridX ?? null,
    grid_y: input.gridY ?? null,
    slot_index: input.slotIndex ?? null,
  });
  if (error) throw error;
}

/**
 * Tip: adds a quantity of a catalog item into a specific pocket — this is
 * where the pure grid/stacking modules from src/lib/grid finally get used
 * for real. It first tops up any existing stack of the same item that
 * has room, then places whatever's left as new stacks, finding each one
 * a free spot (grid pockets) or a free slot (uniform-slot pockets).
 * Throws if there's genuinely no room left, rather than silently
 * dropping items.
 */
export async function addItemToPocket(
  characterId: string,
  characterBagId: string,
  pocket: PocketWithItems,
  catalogItem: CatalogItem,
  quantityToAdd: number
): Promise<void> {
  let remaining = quantityToAdd;

  const existingStack = pocket.items.find(
    (item) => item.catalogItemId === catalogItem.id && item.quantity < catalogItem.stackSize
  );
  if (existingStack) {
    const room = roomLeftInStack(existingStack.quantity, catalogItem.stackSize);
    const addedToStack = Math.min(room, remaining);
    if (addedToStack > 0) {
      const { error } = await supabase
        .from("character_items")
        .update({ quantity: existingStack.quantity + addedToStack })
        .eq("id", existingStack.characterItemId);
      if (error) throw error;
      remaining -= addedToStack;
    }
  }

  if (remaining <= 0) return;

  const newStackQuantities = splitQuantityIntoStacks(remaining, catalogItem.stackSize);

  for (const stackQuantity of newStackQuantities) {
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

      const spot = findFirstFreeSpot(catalogItem.gridWidth, catalogItem.gridHeight, grid, existingPlacements);
      if (!spot) throw new Error(`No room left in ${pocket.name}.`);

      await insertCharacterItem({
        characterId,
        characterBagId,
        pocketTemplateId: pocket.pocketTemplateId,
        catalogItemId: catalogItem.id,
        quantity: stackQuantity,
        gridX: spot.x,
        gridY: spot.y,
      });
    } else {
      const usedSlots = new Set(pocket.items.map((item) => item.slotIndex));
      const maxSlots = pocket.slotCount ?? 0;
      let freeSlot = -1;
      for (let i = 0; i < maxSlots; i++) {
        if (!usedSlots.has(i)) {
          freeSlot = i;
          break;
        }
      }
      if (freeSlot === -1) throw new Error(`No room left in ${pocket.name}.`);

      await insertCharacterItem({
        characterId,
        characterBagId,
        pocketTemplateId: pocket.pocketTemplateId,
        catalogItemId: catalogItem.id,
        quantity: stackQuantity,
        slotIndex: freeSlot,
      });
    }
  }
}

/** Tip: commits a drag-and-drop move — the UI already validated the new spot fits (via placementFits) before calling this, so this is just the write. */
export async function moveItemInGridPocket(characterItemId: string, x: number, y: number): Promise<void> {
  const { error } = await supabase.from("character_items").update({ grid_x: x, grid_y: y }).eq("id", characterItemId);
  if (error) throw error;
}

/** Tip: removes a whole stack from a pocket (the "Drop" action). Doesn't yet route to the campaign's Bag of Holding — that's a DM-tools feature for a later session. */
export async function removeItemFromPocket(characterItemId: string): Promise<void> {
  const { error } = await supabase.from("character_items").delete().eq("id", characterItemId);
  if (error) throw error;
}

/** Tip: bridges this module's DB-shaped bag data into the plain WeighableBag[] shape src/lib/encumbrance/calculateEncumbrance expects — keeps that module ignorant of Supabase entirely. */
export function toWeighableBags(bags: CharacterBagData[]): WeighableBag[] {
  return bags.map((bag) => ({
    bagOwnWeightKg: bag.baseWeightKg,
    isWeightless: bag.isWeightless,
    bonusCapacityKg: bag.bonusCapacityKg,
    items: bag.pockets.flatMap((pocket) =>
      pocket.items.map((item) => ({ unitWeightKg: item.baseWeightKg, quantity: item.quantity }))
    ),
  }));
}
