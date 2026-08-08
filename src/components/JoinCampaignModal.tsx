import { useState } from "react";
import Modal from "./Modal";
import { findCampaignByInviteCode, type CampaignSummary } from "../lib/supabase/campaigns";

interface JoinCampaignModalProps {
  onClose: () => void;
  onJoined: (campaignId: string) => Promise<void>;
}

/**
 * Tip: two-step flow on purpose — look up the code first and show the
 * campaign's name, THEN ask for confirmation to join. Joining a campaign
 * blind off a typo'd code would be a bad surprise.
 */
export default function JoinCampaignModal({ onClose, onJoined }: JoinCampaignModalProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [foundCampaign, setFoundCampaign] = useState<CampaignSummary | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLookup() {
    if (!inviteCode.trim()) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const campaign = await findCampaignByInviteCode(inviteCode);
      if (!campaign) {
        setErrorMessage("No campaign found with that invite code.");
        return;
      }
      setFoundCampaign(campaign);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConfirmJoin() {
    if (!foundCampaign) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await onJoined(foundCampaign.id);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setIsBusy(false);
    }
  }

  if (foundCampaign) {
    return (
      <Modal title="Join Campaign" onClose={onClose}>
        <p className="text-sm" style={{ color: "#a89a7d" }}>
          Found it:
        </p>
        <p className="mt-1 text-lg" style={{ color: "#F0C58A" }}>
          {foundCampaign.name}
        </p>
        {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
        <button
          onClick={handleConfirmJoin}
          disabled={isBusy}
          className="mt-4 w-full rounded py-2.5 font-semibold text-[#121110] disabled:opacity-60"
          style={{ background: "#E2A052" }}
        >
          {isBusy ? "Joining…" : `Join ${foundCampaign.name}`}
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="Join Campaign" onClose={onClose}>
      <label className="text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
        Invite code
      </label>
      <input
        autoFocus
        value={inviteCode}
        onChange={(event) => setInviteCode(event.target.value)}
        placeholder="e.g. 7XQK2M"
        onKeyDown={(event) => event.key === "Enter" && handleLookup()}
        className="mt-1 w-full rounded px-3 py-2 outline-none"
        style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
      />
      {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
      <button
        onClick={handleLookup}
        disabled={isBusy}
        className="mt-4 w-full rounded py-2.5 font-semibold text-[#121110] disabled:opacity-60"
        style={{ background: "#E2A052" }}
      >
        {isBusy ? "Looking up…" : "Find Campaign"}
      </button>
    </Modal>
  );
}
