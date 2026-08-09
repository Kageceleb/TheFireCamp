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
}

/** Tip: the full item catalog — powers the "Add Item" picker in a pocket, and eventually a DM catalog-management screen. */
export async function listCatalogItems(): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from("items_catalog")
    .select("id, name, category, description, base_weight_kg, stack_size, image_url, grid_width, grid_height")
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
  }));
}
