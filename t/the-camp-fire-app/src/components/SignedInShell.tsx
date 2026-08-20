import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import CampaignHub from "./CampaignHub";
import CampaignView from "./CampaignView";

export interface OpenCampaign {
  id: string;
  name: string;
  role: "DM" | "PLAYER";
}

interface SignedInShellProps {
  user: User;
}

/**
 * Tip: the one piece of routing state between "browsing campaigns" and
 * "inside a campaign." This lives here rather than in App (whose only
 * job is auth state) or CampaignHub (whose only job is listing/creating/
 * joining) — each of those stays focused on one thing.
 */
export default function SignedInShell({ user }: SignedInShellProps) {
  const [openCampaign, setOpenCampaign] = useState<OpenCampaign | null>(null);

  if (openCampaign) {
    return (
      <CampaignView
        campaignId={openCampaign.id}
        campaignName={openCampaign.name}
        role={openCampaign.role}
        currentUserId={user.id}
        onBack={() => setOpenCampaign(null)}
      />
    );
  }

  return <CampaignHub user={user} onOpenCampaign={setOpenCampaign} />;
}
