import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { placementFits } from "../../lib/grid/collision";
import type { PlacedGridItem } from "../../lib/grid/gridTypes";
import { iconForCategory } from "./itemIcons";
import type { PlacedItem } from "../../lib/supabase/bags";
import ItemActionPopover from "./ItemActionPopover";

const CELL = 44;
const GAP = 4;

interface PocketGridProps {
  gridWidth: number;
  gridHeight: number;
  items: PlacedItem[];
  canEdit: boolean;
  selectedItemId: string | null;
  onSelectItem: (item: PlacedItem | null) => void;
  onMove: (characterItemId: string, x: number, y: number) => void;
  onEquip: (item: PlacedItem, slot: string) => void;
  onGive: (item: PlacedItem) => void;
  onDrop: (item: PlacedItem) => void;
}

interface DragState {
  characterItemId: string;
  offsetX: number;
  offsetY: number;
  ghostX: number;
  ghostY: number;
  gx?: number;
  gy?: number;
  valid: boolean;
}

/**
 * Tip: the visual Tetris-style grid for one GRID-packing pocket. All the
 * actual "does this fit / where's it going" logic is the shared
 * src/lib/grid engine (the same code covered by unit tests in session
 * one) — this component's only job is translating pointer events into
 * calls to that engine and rendering the result. Drag to rearrange,
 * click to select — and once selected, the action popover renders as
 * part of THIS item's own box (see ItemActionPopover), not somewhere
 * else on the page.
 */
export default function PocketGrid({
  gridWidth,
  gridHeight,
  items,
  canEdit,
  selectedItemId,
  onSelectItem,
  onMove,
  onEquip,
  onGive,
  onDrop,
}: PocketGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const placedItems: PlacedGridItem[] = items
    .filter((item) => item.gridX !== null && item.gridY !== null)
    .map((item) => ({
      characterItemId: item.characterItemId,
      x: item.gridX as number,
      y: item.gridY as number,
      width: item.gridWidth,
      height: item.gridHeight,
    }));

  function handlePointerDown(event: ReactPointerEvent, item: PlacedItem) {
    if (!canEdit || item.gridX === null || item.gridY === null || !containerRef.current) return;
    event.preventDefault();
    onSelectItem(item);

    const rect = containerRef.current.getBoundingClientRect();
    const itemPxX = item.gridX * (CELL + GAP);
    const itemPxY = item.gridY * (CELL + GAP);

    setDragState({
      characterItemId: item.characterItemId,
      offsetX: event.clientX - rect.left - itemPxX,
      offsetY: event.clientY - rect.top - itemPxY,
      ghostX: itemPxX,
      ghostY: itemPxY,
      valid: true,
    });
  }

  useEffect(() => {
    if (!dragState) return;
    const draggedItem = items.find((item) => item.characterItemId === dragState.characterItemId);
    if (!draggedItem || !containerRef.current) return;

    function handleMove(event: PointerEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = event.clientX - rect.left - dragState!.offsetX;
      const rawY = event.clientY - rect.top - dragState!.offsetY;
      const gx = Math.round(rawX / (CELL + GAP));
      const gy = Math.round(rawY / (CELL + GAP));

      const valid = placementFits(
        { x: gx, y: gy, width: draggedItem!.gridWidth, height: draggedItem!.gridHeight },
        { width: gridWidth, height: gridHeight },
        placedItems,
        draggedItem!.characterItemId
      );

      setDragState((prev) => (prev ? { ...prev, ghostX: rawX, ghostY: rawY, gx, gy, valid } : prev));
    }

    function handleUp() {
      setDragState((prev) => {
        if (prev && prev.valid && prev.gx !== undefined && prev.gy !== undefined) {
          onMove(prev.characterItemId, prev.gx, prev.gy);
        }
        return null;
      });
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // Re-run only when the dragged item changes, not on every items/gridWidth
    // update — those are read fresh via closure each time handleMove fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState?.characterItemId]);

  const pixelWidth = gridWidth * CELL + (gridWidth - 1) * GAP;
  const pixelHeight = gridHeight * CELL + (gridHeight - 1) * GAP;
  const draggedItem = dragState ? items.find((item) => item.characterItemId === dragState.characterItemId) : null;

  return (
    <div
      ref={containerRef}
      className="relative rounded-md"
      style={{
        width: pixelWidth,
        height: pixelHeight,
        background: "repeating-linear-gradient(45deg, #262b34, #262b34 2px, #21252d 2px, #21252d 4px)",
        border: "2px solid #3D2B1D",
      }}
    >
      {items.map((item) => {
        if (item.gridX === null || item.gridY === null) return null;
        const Icon = iconForCategory(item.category);
        const isDragging = dragState?.characterItemId === item.characterItemId;
        const isSelected = selectedItemId === item.characterItemId;

        return (
          <div
            key={item.characterItemId}
            onPointerDown={(event) => handlePointerDown(event, item)}
            className="absolute flex touch-none select-none items-center justify-center rounded"
            style={{
              left: item.gridX * (CELL + GAP),
              top: item.gridY * (CELL + GAP),
              width: item.gridWidth * CELL + (item.gridWidth - 1) * GAP,
              height: item.gridHeight * CELL + (item.gridHeight - 1) * GAP,
              background: "linear-gradient(160deg, #5b6472, #3d434d)",
              border: isSelected ? "1px solid #E2A052" : "1px solid #3d434d",
              opacity: isDragging ? 0.35 : 1,
              cursor: canEdit ? "grab" : "default",
              zIndex: isSelected ? 65 : isDragging ? 50 : 1,
              transition: isDragging ? "none" : "left 120ms ease, top 120ms ease",
            }}
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="h-full w-full rounded object-cover" />
            ) : (
              <Icon size={16} color="#f0e6cf" />
            )}
            {item.quantity > 1 && (
              <span className="absolute bottom-0.5 right-1 text-[10px] font-bold" style={{ color: "#f0e6cf" }}>
                {item.quantity}
              </span>
            )}

            {isSelected && canEdit && (
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

      {dragState && draggedItem && (
        <div
          className="pointer-events-none absolute rounded"
          style={{
            left: dragState.ghostX,
            top: dragState.ghostY,
            width: draggedItem.gridWidth * CELL + (draggedItem.gridWidth - 1) * GAP,
            height: draggedItem.gridHeight * CELL + (draggedItem.gridHeight - 1) * GAP,
            background: dragState.valid ? "rgba(90,150,120,0.35)" : "rgba(180,70,50,0.4)",
            border: `2px dashed ${dragState.valid ? "#6fae8c" : "#d9694f"}`,
            zIndex: 60,
          }}
        />
      )}
    </div>
  );
}
