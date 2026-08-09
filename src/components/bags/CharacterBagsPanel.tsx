import { useEffect, useState } from "react";
import {
  getCharacterBags,
  addBagToCharacter,
  moveItemInGridPocket,
  removeItemFromPocket,
  addItemToPocket,
  toWeighableBags,
  type CharacterBagData,
  type PlacedItem,
  type PocketWithItems,
} from "../../lib/supabase/bags";
import { equipItem } from "../../lib/supabase/equipment";
import { calculateEncumbrance } from "../../lib/encumbrance/calculateEncumbrance";
import PocketGrid from "./PocketGrid";
import UniformSlotPocket from "./UniformSlotPocket";
import AddBagModal from "./AddBagModal";
import AddItemModal from "./AddItemModal";

interface CharacterBagsPanelProps {
  characterId: string;
  maxWeightKg: number;
  canEdit: boolean;
  // Bumped by the parent whenever equipment changed somewhere OUTSIDE
  // this panel (e.g. unequipping from the Equipment panel below) — this
  // panel needs to know to refetch, since an unequipped item lands back
  // in a pocket it manages.
  refreshKey: number;
  // Called after THIS panel changes equipment (equipping an item out of
  // a pocket) — lets the parent refresh AC and the Equipment panel.
  onInventoryChanged: () => void;
}

interface AddItemTarget {
  characterBagId: string;
  pocket: PocketWithItems;
}

/**
 * Tip: the whole "Bags" section of the character sheet. Fetches every
 * carried bag with its resolved pockets and items, renders each pocket
 * with the packing UI that matches its type, and runs the encumbrance
 * bar off src/lib/encumbrance so the weight math and the grid math never
 * drift out of sync with each other.
 */
export default function CharacterBagsPanel({ characterId, maxWeightKg, canEdit, refreshKey, onInventoryChanged }: CharacterBagsPanelProps) {
  const [bags, setBags] = useState<CharacterBagData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddBag, setShowAddBag] = useState(false);
  const [addItemTarget, setAddItemTarget] = useState<AddItemTarget | null>(null);
  const [selectedItem, setSelectedItem] = useState<PlacedItem | null>(null);

  useEffect(() => {
    void refresh();
  }, [characterId, refreshKey]);

  async function refresh() {
    setIsLoading(true);
    try {
      setBags(await getCharacterBags(characterId));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMove(characterItemId: string, x: number, y: number) {
    await moveItemInGridPocket(characterItemId, x, y);
    await refresh();
  }

  async function handleDropItem() {
    if (!selectedItem) return;
    await removeItemFromPocket(selectedItem.characterItemId);
    setSelectedItem(null);
    await refresh();
  }

  async function handleEquip(slot: string) {
    if (!selectedItem) return;
    try {
      await equipItem(characterId, selectedItem.characterItemId, slot);
      setSelectedItem(null);
      await refresh();
      onInventoryChanged();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  if (isLoading) {
    return (
      <p className="text-sm" style={{ color: "#8a7d63" }}>
        Loading bags…
      </p>
    );
  }
  if (errorMessage) {
    return <p className="text-sm text-red-400">{errorMessage}</p>;
  }

  const encumbrance = calculateEncumbrance([], toWeighableBags(bags), maxWeightKg);

  return (
    <div className="space-y-4">
      <WeightBar current={encumbrance.totalWeightKg} max={encumbrance.maxWeightKg} isOver={encumbrance.isOverEncumbered} />

      {canEdit && (
        <button
          onClick={() => setShowAddBag(true)}
          className="rounded px-3 py-1.5 text-sm"
          style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
        >
          + Add Bag
        </button>
      )}

      {bags.length === 0 && (
        <p className="text-sm" style={{ color: "#5f5947" }}>
          No bags carried yet.
        </p>
      )}

      {bags.map((bag) => (
        <div key={bag.characterBagId} className="rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
          <div className="mb-3 flex items-center justify-between">
            <span style={{ color: "#F0C58A" }}>{bag.bagTypeName}</span>
            <span className="text-[11px] tracking-widest" style={{ color: "#5f5947" }}>
              {bag.equippedSlot}
            </span>
          </div>

          <div className="space-y-3">
            {bag.pockets.map((pocket) => (
              <div key={pocket.pocketTemplateId}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#a89a7d" }}>
                    {pocket.name}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => setAddItemTarget({ characterBagId: bag.characterBagId, pocket })}
                      className="text-xs"
                      style={{ color: "#E2A052" }}
                    >
                      + Item
                    </button>
                  )}
                </div>

                {pocket.packingType === "GRID" ? (
                  <PocketGrid
                    gridWidth={pocket.gridWidth ?? 0}
                    gridHeight={pocket.gridHeight ?? 0}
                    items={pocket.items}
                    canEdit={canEdit}
                    onMove={handleMove}
                    onSelectItem={setSelectedItem}
                  />
                ) : (
                  <UniformSlotPocket slotCount={pocket.slotCount ?? 0} items={pocket.items} onSelectItem={setSelectedItem} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {selectedItem && (
        <div className="rounded-lg p-4" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
          <div style={{ color: "#F0C58A" }}>{selectedItem.name}</div>
          <div className="mb-3 text-xs" style={{ color: "#8a7d63" }}>
            {selectedItem.baseWeightKg} kg{selectedItem.quantity > 1 ? ` × ${selectedItem.quantity}` : ""}
          </div>
          {canEdit && selectedItem.validSlots.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedItem.validSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => handleEquip(slot)}
                  className="rounded px-2 py-1 text-xs"
                  style={{ background: "#2a2622", color: "#E2A052", border: "1px solid #3D2B1D" }}
                >
                  Equip to {slot}
                </button>
              ))}
            </div>
          )}
          {canEdit && (
            <button onClick={handleDropItem} className="text-sm" style={{ color: "#d9694f" }}>
              Drop
            </button>
          )}
        </div>
      )}

      {showAddBag && (
        <AddBagModal
          onClose={() => setShowAddBag(false)}
          onAdd={async (bagTypeId, equippedSlot) => {
            await addBagToCharacter(characterId, bagTypeId, equippedSlot);
            setShowAddBag(false);
            await refresh();
          }}
        />
      )}

      {addItemTarget && (
        <AddItemModal
          onClose={() => setAddItemTarget(null)}
          onAdd={async (catalogItem, quantity) => {
            await addItemToPocket(characterId, addItemTarget.characterBagId, addItemTarget.pocket, catalogItem, quantity);
            setAddItemTarget(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function WeightBar({ current, max, isOver }: { current: number; max: number; isOver: boolean }) {
  const percentFilled = Math.min(100, (current / max) * 100);
  const barColor = isOver ? "#b3492f" : percentFilled > 80 ? "#a0813f" : "#4a7c74";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
          Carry Weight
        </span>
        <span className="text-sm" style={{ color: isOver ? "#d9694f" : "#F0C58A" }}>
          {current.toFixed(1)} <span style={{ color: "#8a7d63" }}>/ {max} kg</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "#2a2622", border: "1px solid #3D2B1D" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${percentFilled}%`, background: barColor }} />
      </div>
      {isOver && (
        <div className="mt-1 text-[11px]" style={{ color: "#d9694f" }}>
          Encumbered — over capacity
        </div>
      )}
    </div>
  );
}
