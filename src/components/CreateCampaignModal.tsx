import { useState } from "react";
import Modal from "./Modal";

interface CreateCampaignModalProps {
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

/** Tip: a name field and a submit button — campaign creation itself (and making the creator its DM) is handled by src/lib/supabase/campaigns.ts, this component just collects the name. */
export default function CreateCampaignModal({ onClose, onSubmit }: CreateCampaignModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit(name.trim());
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="New Campaign" onClose={onClose}>
      <label className="text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
        Campaign name
      </label>
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. The Sunken Spire"
        onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
        className="mt-1 w-full rounded px-3 py-2 outline-none"
        style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
      />
      {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="mt-4 w-full rounded py-2.5 font-semibold text-[#121110] disabled:opacity-60"
        style={{ background: "#E2A052" }}
      >
        {isSubmitting ? "Creating…" : "Create"}
      </button>
    </Modal>
  );
}
