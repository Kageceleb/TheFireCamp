import { useEffect, useState } from "react";
import {
  listBagOfHolding,
  addLootToBagOfHolding,
  setClaimable,
  deleteBagOfHoldingEntry,
  claimItem,
  type BagOfHoldingEntry,
} from "../lib/supabase/bagOfHolding";
import { listCatalogItems, type CatalogItem } from "../lib/supabase/items";
import type { CharacterListItem } from "../lib/supabase/characters";
import Modal from "./Modal";
import { Field, NumberInput, SubmitButton } from "./FormControls";

interface BagOfHoldingScreenProps {
  campaignId: string;
  role: "DM" | "PLAYER";
  myCharacters: CharacterListItem[];
  onBack: () => void;
}

/**
 * Tip: the campaign-wide loot pool, per spec Module 4. A DM sees every
 * entry and can spawn loot, toggle what's claimable, or discard
 * something outright; a player only ever sees entries already marked
 * claimable, with a button per character they own in this campaign to
 * claim it onto. All the actual permission enforcement happens in
 * Postgres RLS (see 0002_rls_policies.sql) — the role check here just
 * decides what to render, not what's actually allowed.
 */
export default function BagOfHoldingScreen({ campaignId, role, myCharacters, onBack }: BagOfHoldingScreenProps) {
  const [entries, setEntries] = useState<BagOfHoldingEntry[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddLoot, setShowAddLoot] = useState(false);

  useEffect(() => {
    void refresh();
    if (role === "DM") {
      listCatalogItems().then(setCatalogItems);
    }
  }, []);

  async function refresh() {
    setIsLoading(true);
    try {
      setEntries(await listBagOfHolding(campaignId));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleClaimable(entry: BagOfHoldingEntry) {
    try {
      await setClaimable(entry.id, !entry.isClaimableByPlayers);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function handleDiscard(entryId: string) {
    try {
      await deleteBagOfHoldingEntry(entryId);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function handleClaim(entry: BagOfHoldingEntry, characterId: string) {
    try {
      await claimItem(entry.id, characterId, campaignId, entry.catalogItemId, entry.gridWidth, entry.gridHeight);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  // A DM sees the whole pool (staged loot included); a player only
  // ever sees what's actually been made claimable.
  const visibleEntries = role === "DM" ? entries : entries.filter((entry) => entry.isClaimableByPlayers);

  return (
    <div className="min-h-screen w-full px-4 py-8" style={{ background: "radial-gradient(ellipse at top, #1c1a17 0%, #121110 65%)" }}>
      <style>{`* { font-family: 'Inter', sans-serif; }`}</style>
      <div className="mx-auto max-w-lg">
        <button onClick={onBack} className="mb-4 text-sm" style={{ color: "#a89a7d" }}>
          &larr; Back
        </button>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl tracking-wide" style={{ fontFamily: "Cinzel, serif", color: "#F0C58A" }}>
            Bag of Holding
          </h1>
          {role === "DM" && (
            <button onClick={() => setShowAddLoot(true)} className="text-sm" style={{ color: "#E2A052" }}>
              + Add Loot
            </button>
          )}
        </div>

        {errorMessage && <p className="mb-4 text-sm text-red-400">{errorMessage}</p>}

        {isLoading ? (
          <p className="text-sm" style={{ color: "#8a7d63" }}>
            Loading…
          </p>
        ) : visibleEntries.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "#5f5947" }}>
            {role === "DM" ? "Nothing here yet — dropped items and spawned loot show up here." : "No loot available to claim right now."}
          </p>
        ) : (
          <div className="space-y-2">
            {visibleEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg p-3" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span style={{ color: "#F0C58A" }}>{entry.name}</span>
                    {entry.quantity > 1 && (
                      <span className="ml-1 text-xs" style={{ color: "#8a7d63" }}>
                        × {entry.quantity}
                      </span>
                    )}
                    {entry.droppedByCharacterName && (
                      <div className="text-[11px]" style={{ color: "#5f5947" }}>Dropped by {entry.droppedByCharacterName}</div>
                    )}
                  </div>
                  {role === "DM" && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleClaimable(entry)}
                        className="text-xs"
                        style={{ color: entry.isClaimableByPlayers ? "#4a7c74" : "#a89a7d" }}
                      >
                        {entry.isClaimableByPlayers ? "Claimable" : "Make Claimable"}
                      </button>
                      <button onClick={() => handleDiscard(entry.id)} className="text-xs" style={{ color: "#d9694f" }}>
                        Discard
                      </button>
                    </div>
                  )}
                </div>

                {role === "PLAYER" && entry.isClaimableByPlayers && myCharacters.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {myCharacters.map((character) => (
                      <button
                        key={character.id}
                        onClick={() => handleClaim(entry, character.id)}
                        className="rounded px-2 py-1 text-xs"
                        style={{ background: "#2a2622", color: "#E2A052", border: "1px solid #3D2B1D" }}
                      >
                        Claim to {character.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddLoot && (
        <AddLootModal
          catalogItems={catalogItems}
          onClose={() => setShowAddLoot(false)}
          onAdd={async (catalogItemId, quantity) => {
            await addLootToBagOfHolding(campaignId, catalogItemId, quantity);
            setShowAddLoot(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function AddLootModal({
  catalogItems,
  onClose,
  onAdd,
}: {
  catalogItems: CatalogItem[];
  onClose: () => void;
  onAdd: (catalogItemId: string, quantity: number) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(catalogItems[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selectedId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onAdd(selectedId, quantity);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Add Loot" onClose={onClose}>
      <Field label="Item">
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="mt-1 w-full rounded px-3 py-2"
          style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
        >
          {catalogItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Quantity">
        <NumberInput value={quantity} onChange={setQuantity} min={1} />
      </Field>
      {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
      <SubmitButton label={isSubmitting ? "Adding…" : "Add Loot"} onClick={handleSubmit} disabled={isSubmitting} />
    </Modal>
  );
}
