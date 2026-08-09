import { useEffect, useState } from "react";
import Modal from "../Modal";
import { listBagTypes, type BagTypeOption } from "../../lib/supabase/bags";

interface AddBagModalProps {
  onClose: () => void;
  onAdd: (bagTypeId: string, equippedSlot: string) => Promise<void>;
}

/** Tip: picks a bag type from the (DM-extensible) catalog and assigns it to a body slot — defaults to the bag type's own usual slot, but the field stays editable in case a homebrew bag is worn somewhere unusual. */
export default function AddBagModal({ onClose, onAdd }: AddBagModalProps) {
  const [bagTypes, setBagTypes] = useState<BagTypeOption[]>([]);
  const [bagTypeId, setBagTypeId] = useState("");
  const [equippedSlot, setEquippedSlot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    listBagTypes().then((rows) => {
      setBagTypes(rows);
      if (rows[0]) {
        setBagTypeId(rows[0].id);
        setEquippedSlot(rows[0].bodySlot);
      }
    });
  }, []);

  function handleBagTypeChange(id: string) {
    setBagTypeId(id);
    const found = bagTypes.find((bagType) => bagType.id === id);
    if (found) setEquippedSlot(found.bodySlot);
  }

  async function handleSubmit() {
    if (!bagTypeId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onAdd(bagTypeId, equippedSlot);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Add Bag" onClose={onClose}>
      <label className="text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
        Bag Type
      </label>
      <select
        value={bagTypeId}
        onChange={(event) => handleBagTypeChange(event.target.value)}
        className="mt-1 w-full rounded px-3 py-2"
        style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
      >
        {bagTypes.map((bagType) => (
          <option key={bagType.id} value={bagType.id}>
            {bagType.name}
          </option>
        ))}
      </select>

      <label className="mt-3 block text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
        Body Slot
      </label>
      <input
        value={equippedSlot}
        onChange={(event) => setEquippedSlot(event.target.value)}
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
        {isSubmitting ? "Adding…" : "Add Bag"}
      </button>
    </Modal>
  );
}
