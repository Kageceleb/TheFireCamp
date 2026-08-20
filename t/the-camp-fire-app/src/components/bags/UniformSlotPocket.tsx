import { iconForCategory } from "./itemIcons";
import type { PlacedItem } from "../../lib/supabase/bags";
import ItemActionPopover from "./ItemActionPopover";

interface UniformSlotPocketProps {
  slotCount: number;
  items: PlacedItem[];
  canEdit: boolean;
  selectedItemId: string | null;
  onSelectItem: (item: PlacedItem | null) => void;
  onEquip: (item: PlacedItem, slot: string) => void;
  onGive: (item: PlacedItem) => void;
  onDrop: (item: PlacedItem) => void;
}

/**
 * Tip: renders a uniform-slot pocket — one interchangeable slot per
 * item, no shape puzzle. Unlike PocketGrid there's deliberately no drag
 * here: a flask doesn't have a "position" within the Glass Pocket, just
 * which of the N slots it occupies, so click-to-select is all this
 * needs. Same ItemActionPopover as PocketGrid, anchored the same way —
 * as a child of the selected item's own box.
 */
export default function UniformSlotPocket({
  slotCount,
  items,
  canEdit,
  selectedItemId,
  onSelectItem,
  onEquip,
  onGive,
  onDrop,
}: UniformSlotPocketProps) {
  const itemBySlot = new Map(items.map((item) => [item.slotIndex, item]));

  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: slotCount }).map((_, slotIndex) => {
        const item = itemBySlot.get(slotIndex);
        const Icon = item ? iconForCategory(item.category) : null;
        const isSelected = item && selectedItemId === item.characterItemId;

        return (
          <div
            key={slotIndex}
            onClick={() => item && canEdit && onSelectItem(item)}
            className="relative flex h-10 w-10 items-center justify-center rounded"
            style={{
              background: item ? "linear-gradient(160deg, #5b6472, #3d434d)" : "#21252d",
              border: isSelected ? "1px solid #E2A052" : "1px solid #3D2B1D",
              cursor: item && canEdit ? "pointer" : "default",
              zIndex: isSelected ? 65 : 1,
            }}
          >
            {item?.imageUrl ? (
              <img src={item.imageUrl} alt="" className="h-full w-full rounded object-cover" />
            ) : (
              Icon && <Icon size={16} color="#f0e6cf" />
            )}
            {item && item.quantity > 1 && (
              <span className="absolute bottom-0 right-0.5 text-[9px] font-bold" style={{ color: "#f0e6cf" }}>
                {item.quantity}
              </span>
            )}

            {isSelected && item && canEdit && (
              <ItemActionPopover
                item={item}
                onEquip={(slot) => onEquip(item, slot)}
                onGive={() => onGive(item)}
                onDrop={() => onDrop(item)}
                onClose={() => onSelectItem(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
