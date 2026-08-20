import type { PlacedItem } from "../../lib/supabase/bags";

interface ItemActionPopoverProps {
  item: PlacedItem;
  onEquip: (slot: string) => void;
  onGive: () => void;
  onDrop: () => void;
  onClose: () => void;
}

/**
 * Tip: the action menu for one selected item, rendered as a CHILD of
 * that item's own box in the pocket. The item's box is already
 * `position: absolute` (see PocketGrid/UniformSlotPocket), which is
 * enough on its own to be a positioning anchor for this popover's
 * `top: 100%` — no extra wrapper needed. Used by both pocket types so
 * equip/give/throw-on-ground behave identically regardless of packing
 * style. Only ever rendered when canEdit is true — the parent pocket
 * components already gate that before mounting this.
 */
export default function ItemActionPopover({ item, onEquip, onGive, onDrop, onClose }: ItemActionPopoverProps) {
  return (
    <div
      className="absolute left-0 top-full z-[70] mt-1 min-w-[150px] rounded-md p-2"
      style={{ background: "#1e1c19", border: "1px solid #4a3f2f", boxShadow: "0 4px 14px rgba(0,0,0,0.55)" }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-1.5 truncate text-xs" style={{ color: "#F0C58A" }}>
        {item.name}
        {item.quantity > 1 && (
          <span style={{ color: "#8a7d63" }}> × {item.quantity}</span>
        )}
      </div>

      {item.validSlots.map((slot) => (
        <button
          key={slot}
          onClick={() => onEquip(slot)}
          className="block w-full rounded px-2 py-1 text-left text-xs"
          style={{ color: "#E2A052" }}
        >
          Equip to {slot}
        </button>
      ))}

      <button onClick={onGive} className="block w-full rounded px-2 py-1 text-left text-xs" style={{ color: "#a89a7d" }}>
        Give…
      </button>

      <button onClick={onDrop} className="block w-full rounded px-2 py-1 text-left text-xs" style={{ color: "#d9694f" }}>
        Throw on ground
      </button>

      <button onClick={onClose} className="mt-1 block w-full text-center text-[10px]" style={{ color: "#5f5947" }}>
        Close
      </button>
    </div>
  );
}
