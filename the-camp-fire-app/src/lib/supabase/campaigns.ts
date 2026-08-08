import { supabase } from "./client";

export interface CampaignSummary {
  id: string;
  name: string;
  inviteCode: string;
}

export interface CampaignMembership {
  role: "DM" | "PLAYER";
  campaign: CampaignSummary;
}

/**
 * Tip: call this to populate the Campaign Hub screen on load — every
 * campaign the signed-in user belongs to, with their role in each. RLS
 * (see supabase/migrations/0002_rls_policies.sql) already restricts this
 * to the current user's own memberships, so there's no need to filter by
 * user id here — the database does it.
 */
export async function listMyCampaigns(): Promise<CampaignMembership[]> {
  const { data, error } = await supabase
    .from("campaign_members")
    .select("role, campaign:campaigns(id, name, invite_code)")
    .order("joined_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    role: row.role as "DM" | "PLAYER",
    campaign: {
      id: row.campaign.id,
      name: row.campaign.name,
      inviteCode: row.campaign.invite_code,
    },
  }));
}

/**
 * Tip: looks up a campaign by invite code before the user has joined it,
 * so "Join with Code" can show the campaign's name for confirmation.
 * Returns null if no campaign has that code.
 */
export async function findCampaignByInviteCode(inviteCode: string): Promise<CampaignSummary | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, invite_code")
    .eq("invite_code", inviteCode.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { id: data.id, name: data.name, inviteCode: data.invite_code };
}

/** Tip: 6-character invite code, avoiding visually-ambiguous characters (0/O, 1/I) so players can read it off a screen or whiteboard without mistakes. */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Tip: creates a campaign and makes the creator its DM in one call.
 * user_id on campaign_members defaults to auth.uid() at the database
 * level (see the schema migration), so it doesn't need to be passed
 * from here.
 */
export async function createCampaign(name: string, displayName: string): Promise<CampaignSummary> {
  const inviteCode = generateInviteCode();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({ name, invite_code: inviteCode })
    .select("id, name, invite_code")
    .single();

  if (campaignError) throw campaignError;

  const { error: memberError } = await supabase.from("campaign_members").insert({
    campaign_id: campaign.id,
    role: "DM",
    display_name: displayName,
  });

  if (memberError) throw memberError;

  return { id: campaign.id, name: campaign.name, inviteCode: campaign.invite_code };
}

/** Tip: joins an existing campaign as a PLAYER — a DM promotes from there if needed (see MembersPanel, once built). */
export async function joinCampaign(campaignId: string, displayName: string): Promise<void> {
  const { error } = await supabase.from("campaign_members").insert({
    campaign_id: campaignId,
    role: "PLAYER",
    display_name: displayName,
  });

  if (error) throw error;
}
