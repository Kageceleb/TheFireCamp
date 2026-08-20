import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  createCampaign,
  joinCampaign,
  listMyCampaigns,
  type CampaignMembership,
} from "../lib/supabase/campaigns";
import { signOut } from "../lib/supabase/auth";
import CreateCampaignModal from "./CreateCampaignModal";
import JoinCampaignModal from "./JoinCampaignModal";
import SymbioteStatusBadge from "./SymbioteStatusBadge";
import type { OpenCampaign } from "./SignedInShell";

interface CampaignHubProps {
  user: User;
  onOpenCampaign: (campaign: OpenCampaign) => void;
}

type ActiveModal = "create" | "join" | null;

/**
 * Tip: the post-sign-in landing screen. Its job is "show my campaigns,
 * let me create or join one, or open one" — what happens INSIDE a
 * campaign is CampaignView's job, not this component's.
 */
export default function CampaignHub({ user, onOpenCampaign }: CampaignHubProps) {
  const [memberships, setMemberships] = useState<CampaignMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Google's profile fields aren't guaranteed present, so fall back to email.
  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Adventurer";

  useEffect(() => {
    void refreshCampaigns();
  }, []);

  async function refreshCampaigns() {
    setIsLoading(true);
    try {
      setMemberships(await listMyCampaigns());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateCampaign(name: string) {
    await createCampaign(name, displayName);
    setActiveModal(null);
    await refreshCampaigns();
  }

  async function handleJoinCampaign(campaignId: string) {
    await joinCampaign(campaignId, displayName);
    setActiveModal(null);
    await refreshCampaigns();
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center py-10 px-4"
      style={{ background: "radial-gradient(ellipse at top, #1c1a17 0%, #121110 65%)" }}
    >
      <style>{`* { font-family: 'Inter', sans-serif; }`}</style>
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-xl tracking-wide" style={{ fontFamily: "Cinzel, serif", color: "#F0C58A" }}>
            The Camp Fire
          </h1>
          <button onClick={() => void signOut()} className="text-sm" style={{ color: "#a89a7d" }}>
            Sign out
          </button>
        </div>

        <div className="mb-6">
          <SymbioteStatusBadge />
        </div>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveModal("create")}
            className="flex-1 rounded py-2.5 font-medium text-[#121110]"
            style={{ background: "#E2A052" }}
          >
            New Campaign
          </button>
          <button
            onClick={() => setActiveModal("join")}
            className="flex-1 rounded py-2.5 font-medium"
            style={{ background: "#1e1c19", border: "1px solid #3D2B1D", color: "#F0C58A" }}
          >
            Join with Code
          </button>
        </div>

        {errorMessage && <p className="mb-4 text-sm text-red-400">{errorMessage}</p>}

        {isLoading ? (
          <p className="text-sm" style={{ color: "#8a7d63" }}>
            Loading your campaigns…
          </p>
        ) : (
          <CampaignList memberships={memberships} onSelect={onOpenCampaign} />
        )}
      </div>

      {activeModal === "create" && (
        <CreateCampaignModal onClose={() => setActiveModal(null)} onSubmit={handleCreateCampaign} />
      )}
      {activeModal === "join" && (
        <JoinCampaignModal onClose={() => setActiveModal(null)} onJoined={handleJoinCampaign} />
      )}
    </div>
  );
}

/** Tip: pure display of whatever campaign list it's given — doesn't fetch anything itself, so it's trivial to test or reuse. Clicking a row opens that campaign. */
function CampaignList({
  memberships,
  onSelect,
}: {
  memberships: CampaignMembership[];
  onSelect: (campaign: OpenCampaign) => void;
}) {
  if (memberships.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: "#5f5947" }}>
        No campaigns yet. Create one or join with an invite code.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {memberships.map(({ campaign, role }) => (
        <button
          key={campaign.id}
          onClick={() => onSelect({ id: campaign.id, name: campaign.name, role })}
          className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left"
          style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}
        >
          <span style={{ color: "#F0C58A" }}>{campaign.name}</span>
          <span className="text-[11px] tracking-widest" style={{ color: "#5f5947" }}>
            {role}
          </span>
        </button>
      ))}
    </div>
  );
}
