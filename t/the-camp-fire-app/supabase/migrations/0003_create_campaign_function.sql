-- Fixes: creating a campaign requires inserting a campaign_members row
-- with role = 'DM', but the RLS policy for that insert checks "is this
-- user already a DM of this campaign" — which can never be true yet for
-- a campaign that doesn't exist until this exact insert. A SECURITY
-- DEFINER function sidesteps the paradox: it runs with the function
-- owner's privileges (bypassing RLS for its own two inserts), while the
-- function body itself is the only thing controlling what gets
-- inserted — it always hardcodes role = 'DM' and user_id = auth.uid(),
-- so a caller can't use it to grant themselves DM on someone else's
-- campaign or any other row shape.
--
-- This also makes campaign creation atomic: previously "create the
-- campaign" and "add the creator as DM" were two separate client-side
-- calls, so a failure on the second one (like the RLS error that
-- surfaced this bug) left an orphaned campaign row with no DM. One
-- function call means both succeed together or neither does.

create or replace function create_campaign_with_dm(
  campaign_name text,
  campaign_invite_code text,
  creator_display_name text
)
returns campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  new_campaign campaigns;
begin
  insert into campaigns (name, invite_code)
  values (campaign_name, campaign_invite_code)
  returning * into new_campaign;

  insert into campaign_members (campaign_id, user_id, role, display_name)
  values (new_campaign.id, auth.uid(), 'DM', creator_display_name);

  return new_campaign;
end;
$$;

grant execute on function create_campaign_with_dm(text, text, text) to authenticated;
