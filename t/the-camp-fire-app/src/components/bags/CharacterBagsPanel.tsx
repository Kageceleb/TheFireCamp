import { useState, useEffect } from "react";
import {
  getCharacterBags,
  addBagToCharacter,
  moveItemInGridPocket,
  addItemToPocket,
  toWeighableBags,
  type CharacterBagData,
  type PlacedItem,
  type PocketWithItems,
} from "../../lib/supabase/bags";
import { equipItem } from "../../lib/supabase/equipment";
import { dropItemToBagOfHolding } from "../../lib/supabase/bagOfHolding";
import { giveItemDirectly, createTransferRequest } from "../../lib/supabase/itemTransfers";
import { calculateEncumbrance } from "../../lib/encumbrance/calculateEncumbrance";
import PocketGrid from "./PocketGrid";
import UniformSlotPocket from "./UniformSlotPocket";
import AddBagModal from "./AddBagModal";
import AddItemModal from "./AddItemModal";
import GiveItemModal from "./GiveItemModal";
import PendingTransfersPanel from "./PendingTransfersPanel";

interface CharacterBagsPanelProps {
  characterId: string;
  campaignId: string;
  maxWeightKg: number;
  canEdit: boolean;
  isDM: boolean;
  // Bumped by the parent whenever equipment changed somewhere OUTSIDE
  // this panel (e.g. unequipping from the Equipment panel below) — this
  // panel needs to know to refetch, since an unequipped item lands back
  // in a pocket it manages. Also passed straight through to
  // PendingTransfersPanel so an accepted transfer refreshes it too.
  refreshKey: number;
  // Called after THIS panel changes equipment or inventory (equipping,
  // giving, accepting a transfer) — lets the parent refresh AC and the
  // Equipment panel.
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
 *
 * Item actions (equip/give/drop) live in each pocket's own selected-item
 * popover now, not a panel down here — this component just owns the
 * SELECTION state (selectedItemId) and the handlers the popovers call
 * into, passed down to whichever pocket currently has the selection.
 */
export default function CharacterBagsPanel({
  characterId,
  campaignId,
  maxWeightKg,
  canEdit,
  isDM,
  refreshKey,
  onInventoryChanged,
}: CharacterBagsPanelProps) {
  const [bags, setBags] = useState<CharacterBagData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddBag, setShowAddBag] = useState(false);
  const [addItemTarget, setAddItemTarget] = useState<AddItemTarget | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [giveItem, setGiveItem] = useState<PlacedItem | null>(null);

  useEffect(() => {
    void refresh();
  }, [characterId, refreshKey]);

  async function refresh() {
    try {
      setBags(await getCharacterBags(characterId));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      // isLoading only ever needs to gate the FIRST load — flipping it back
      // to true on every subsequent refresh (e.g. after a drag) replaces
      // this whole panel with a one-line placeholder and back again, which
      // is a large enough layout shift to yank the page's scroll position.
      setIsLoading(false);
    }
  }

  async function handleMove(characterItemId: string, x: number, y: number) {
    await moveItemInGridPocket(characterItemId, x, y);
    await refresh();
  }

  async function handleEquip(item: PlacedItem, slot: string) {
    try {
      await equipItem(characterId, item.characterItemId, slot);
      setSelectedItemId(null);
      await refresh();
      onInventoryChanged();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function handleDrop(item: PlacedItem) {
    try {
      await dropItemToBagOfHolding(campaignId, characterId, item.characterItemId);
      setSelectedItemId(null);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function handleGiveConfirmed(toCharacterId: string) {
    if (!giveItem) return;
    if (isDM) {
      await giveItemDirectly(toCharacterId, giveItem.characterItemId, giveItem.gridWidth, giveItem.gridHeight);
      await refresh();
      onInventoryChanged();
    } else {
      await createTransferRequest(characterId, toCharacterId, giveItem.catalogItemId, giveItem.quantity);
    }
    setGiveItem(null);
    setSelectedItemId(null);
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

      <PendingTransfersPanel
        characterId={characterId}
        canEdit={canEdit}
        refreshKey={refreshKey}
        onResolved={() => {
          void refresh();
          onInventoryChanged();
        }}
      />

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
                    selectedItemId={selectedItemId}
                    onSelectItem={(item) => setSelectedItemId(item?.characterItemId ?? null)}
                    onMove={handleMove}
                    onEquip={handleEquip}
                    onGive={setGiveItem}
                    onDrop={handleDrop}
                  />
                ) : (
                  <UniformSlotPocket
                    slotCount={pocket.slotCount ?? 0}
                    items={pocket.items}
                    canEdit={canEdit}
                    selectedItemId={selectedItemId}
                    onSelectItem={(item) => setSelectedItemId(item?.characterItemId ?? null)}
                    onEquip={handleEquip}
                    onGive={setGiveItem}
                    onDrop={handleDrop}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

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

      {giveItem && (
        <GiveItemModal
          campaignId={campaignId}
          excludeCharacterId={characterId}
          itemName={giveItem.name}
          isDM={isDM}
          onClose={() => setGiveItem(null)}
          onGive={handleGiveConfirmed}
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
