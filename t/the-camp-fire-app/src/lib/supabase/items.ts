import { supabase } from "./client";

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  baseWeightKg: number;
  stackSize: number;
  imageUrl: string | null;
  gridWidth: number;
  gridHeight: number;
  validSlots: string[];
  typeAttributes: Record<string, unknown> | null;
}

/** Tip: the full item catalog — powers the "Add Item" picker in a pocket, and the DM catalog-management screen. */
export async function listCatalogItems(): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from("items_catalog")
    .select(
      "id, name, category, description, base_weight_kg, stack_size, image_url, grid_width, grid_height, valid_slots, type_attributes"
    )
    .order("name");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    baseWeightKg: row.base_weight_kg,
    stackSize: row.stack_size,
    imageUrl: row.image_url,
    gridWidth: row.grid_width,
    gridHeight: row.grid_height,
    validSlots: row.valid_slots ?? [],
    typeAttributes: row.type_attributes,
  }));
}

export interface NewCatalogItemInput {
  name: string;
  category: string;
  description: string;
  baseWeightKg: number;
  stackSize: number;
  gridWidth: number;
  gridHeight: number;
  validSlots: string[];
  imageUrl: string;
  typeAttributes: Record<string, unknown> | null;
}

/** Tip: adds a new item to the global catalog. DM-only is enforced by Postgres RLS (is_dm_of_any_campaign), not by this function — a non-DM calling this simply gets a rejected insert back as an error. */
export async function createCatalogItem(input: NewCatalogItemInput): Promise<void> {
  const { error } = await supabase.from("items_catalog").insert({
    name: input.name,
    category: input.category,
    description: input.description || null,
    base_weight_kg: input.baseWeightKg,
    stack_size: input.stackSize,
    grid_width: input.gridWidth,
    grid_height: input.gridHeight,
    valid_slots: input.validSlots,
    image_url: input.imageUrl || null,
    type_attributes: input.typeAttributes,
  });
  if (error) throw error;
}

/**
 * Tip: removes an item from the global catalog. If any character is
 * currently carrying it (or it's sitting in a campaign's Bag of
 * Holding), the database's foreign key rejects the delete rather than
 * silently orphaning references to it — that's intentional, not a bug,
 * so translate that specific failure into a clear message rather than
 * showing the raw Postgres error.
 */
export async function deleteCatalogItem(id: string): Promise<void> {
  const { error } = await supabase.from("items_catalog").delete().eq("id", id);
  if (error) {
    if (error.message.includes("foreign key")) {
      throw new Error("This item is currently carried by a character (or sitting in the Bag of Holding) and can't be deleted.");
    }
    throw error;
  }
}
