import { useEffect, useState } from "react";
import Modal from "../Modal";
import { listCatalogItems, type CatalogItem } from "../../lib/supabase/items";

interface AddItemModalProps {
  onClose: () => void;
  onAdd: (catalogItem: CatalogItem, quantity: number) => Promise<void>;
}

/** Tip: picks an item from the global catalog and a quantity — placement (which grid spot or slot it actually lands in) is entirely src/lib/supabase/bags.ts's job, this component doesn't know anything about grids or stacking. */
export default function AddItemModal({ onClose, onAdd }: AddItemModalProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    listCatalogItems().then((rows) => {
      setItems(rows);
      if (rows[0]) setSelectedId(rows[0].id);
    });
  }, []);

  async function handleSubmit() {
    const item = items.find((candidate) => candidate.id === selectedId);
    if (!item) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onAdd(item, quantity);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Add Item" onClose={onClose}>
      <label className="text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
        Item
      </label>
      <select
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        className="mt-1 w-full rounded px-3 py-2"
        style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
      >
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.gridWidth}×{item.gridHeight})
          </option>
        ))}
      </select>

      <label className="mt-3 block text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
        Quantity
      </label>
      <input
        type="number"
        min={1}
        value={quantity}
        onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
        className="mt-1 w-full rounded px-3 py-2"
        style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
      />

      {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="mt-4 w-full rounded py-2.5 font-semibold text-[#121110] disabled:opacity-60"
        style={{ background: "#E2A052" }}
      >
        {isSubmitting ? "Adding…" : "Add"}
      </button>
    </Modal>
  );
}
