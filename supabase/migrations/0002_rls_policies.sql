-- The Camp Fire — Row Level Security policies
--
-- Supabase turns on Postgres RLS enforcement per-table; with no policies,
-- a table with RLS enabled denies everything by default. Every table
-- from 0001 gets RLS enabled here, plus the policies that implement the
-- DM/player permission model from spec v5 Section 4.
--
-- Helper functions are marked `security definer` so they can check
-- campaign_members without being blocked by campaign_members' OWN RLS
-- policies while evaluating (which would otherwise recurse).

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

/* Tip: the base membership check — is the current user in this campaign at all, regardless of role. */
create or replace function is_campaign_member(target_campaign_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from campaign_members
    where campaign_id = target_campaign_id
      and user_id = auth.uid()
  );
$$;

/* Tip: the DM-only check — use this to gate any write that should be DM-exclusive (catalog edits, loot spawning, role changes). */
create or replace function is_campaign_dm(target_campaign_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from campaign_members
    where campaign_id = target_campaign_id
      and user_id = auth.uid()
      and role = 'DM'
  );
$$;

/* Tip: for the GLOBAL catalogs (items, spells, classes...) that aren't scoped to one campaign — is this user a DM of ANY campaign, which is enough to earn homebrew-editing rights on shared reference data. */
create or replace function is_dm_of_any_campaign()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from campaign_members
    where user_id = auth.uid()
      and role = 'DM'
  );
$$;

/* Tip: does the current user own this specific character (i.e. are they the player playing it). */
create or replace function owns_character(target_character_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from characters
    where id = target_character_id
      and user_id = auth.uid()
  );
$$;

/* Tip: looks up which campaign a character belongs to, so child tables (items, bags, skills...) can check campaign-level DM rights without duplicating campaign_id on every table. */
create or replace function character_campaign_id(target_character_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select campaign_id from characters where id = target_character_id;
$$;

/* Tip: same idea one level deeper — which character owns a given carried bag, for tables keyed off character_bag_id rather than character_id directly. */
create or replace function bag_owner_character_id(target_bag_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select character_id from character_bags where id = target_bag_id;
$$;

-- ---------------------------------------------------------------------------
-- Campaigns & membership
-- ---------------------------------------------------------------------------

alter table campaigns enable row level security;

-- Any signed-in user can read a campaign's basic info (name, invite code) —
-- needed so "Join with Code" can show the campaign name before the user
-- is actually a member yet. Nothing sensitive lives on this row.
create policy "campaigns_select_any_authenticated" on campaigns
  for select to authenticated using (true);

create policy "campaigns_insert_any_authenticated" on campaigns
  for insert to authenticated with check (true);

create policy "campaigns_update_dm_only" on campaigns
  for update to authenticated using (is_campaign_dm(id));

create policy "campaigns_delete_dm_only" on campaigns
  for delete to authenticated using (is_campaign_dm(id));

alter table campaign_members enable row level security;

create policy "campaign_members_select_members_only" on campaign_members
  for select to authenticated using (is_campaign_member(campaign_id));

-- Joining via invite code: a user can add themselves, but only as PLAYER —
-- becoming DM only happens by creating the campaign (see application code)
-- or being promoted by an existing DM (the policy below).
create policy "campaign_members_insert_self_as_player" on campaign_members
  for insert to authenticated
  with check (user_id = auth.uid() and role = 'PLAYER');

create policy "campaign_members_insert_by_dm" on campaign_members
  for insert to authenticated with check (is_campaign_dm(campaign_id));

create policy "campaign_members_update_by_dm" on campaign_members
  for update to authenticated using (is_campaign_dm(campaign_id));

create policy "campaign_members_delete_by_dm" on campaign_members
  for delete to authenticated using (is_campaign_dm(campaign_id));

-- ---------------------------------------------------------------------------
-- Global catalogs — read by anyone signed in, written by any DM
-- ---------------------------------------------------------------------------

-- Same four policies (select-all, insert/update/delete-by-any-DM) repeat
-- across every global catalog table. This is the exact same business rule
-- each time ("shared reference data, DM-editable"), so it's written once
-- per table rather than abstracted into something cleverer — six short,
-- readable blocks beat one generic-but-opaque helper for this.

alter table eras enable row level security;
create policy "eras_select_all" on eras for select to authenticated using (true);
create policy "eras_write_dm_only" on eras for all to authenticated
  using (is_dm_of_any_campaign()) with check (is_dm_of_any_campaign());

alter table items_catalog enable row level security;
create policy "items_catalog_select_all" on items_catalog for select to authenticated using (true);
create policy "items_catalog_write_dm_only" on items_catalog for all to authenticated
  using (is_dm_of_any_campaign()) with check (is_dm_of_any_campaign());

alter table classes_catalog enable row level security;
create policy "classes_catalog_select_all" on classes_catalog for select to authenticated using (true);
create policy "classes_catalog_write_dm_only" on classes_catalog for all to authenticated
  using (is_dm_of_any_campaign()) with check (is_dm_of_any_campaign());

alter table skill_definitions enable row level security;
create policy "skill_definitions_select_all" on skill_definitions for select to authenticated using (true);
create policy "skill_definitions_write_dm_only" on skill_definitions for all to authenticated
  using (is_dm_of_any_campaign()) with check (is_dm_of_any_campaign());

alter table spells_catalog enable row level security;
create policy "spells_catalog_select_all" on spells_catalog for select to authenticated using (true);
create policy "spells_catalog_write_dm_only" on spells_catalog for all to authenticated
  using (is_dm_of_any_campaign()) with check (is_dm_of_any_campaign());

alter table spell_era_overrides enable row level security;
create policy "spell_era_overrides_select_all" on spell_era_overrides for select to authenticated using (true);
create policy "spell_era_overrides_write_dm_only" on spell_era_overrides for all to authenticated
  using (is_dm_of_any_campaign()) with check (is_dm_of_any_campaign());

alter table bag_types enable row level security;
create policy "bag_types_select_all" on bag_types for select to authenticated using (true);
create policy "bag_types_write_dm_only" on bag_types for all to authenticated
  using (is_dm_of_any_campaign()) with check (is_dm_of_any_campaign());

alter table pocket_templates enable row level security;
create policy "pocket_templates_select_all" on pocket_templates for select to authenticated using (true);
create policy "pocket_templates_write_dm_only" on pocket_templates for all to authenticated
  using (is_dm_of_any_campaign()) with check (is_dm_of_any_campaign());

-- ---------------------------------------------------------------------------
-- Characters and everything that hangs off them
-- ---------------------------------------------------------------------------

alter table characters enable row level security;

create policy "characters_select_campaign_members" on characters
  for select to authenticated using (is_campaign_member(campaign_id));

create policy "characters_insert_dm_or_self" on characters
  for insert to authenticated
  with check (is_campaign_dm(campaign_id) or user_id = auth.uid());

create policy "characters_update_dm_or_owner" on characters
  for update to authenticated
  using (is_campaign_dm(campaign_id) or user_id = auth.uid());

create policy "characters_delete_dm_only" on characters
  for delete to authenticated using (is_campaign_dm(campaign_id));

-- Same shape repeats for every table keyed directly by character_id: the
-- campaign's DM can manage it, or the owning player can manage their own.
-- Written per-table (not a generic helper) because each is a genuinely
-- separate table/business object, even though the rule is identical —
-- this is the "pragmatic" half of pragmatic DRY: same RULE, different DATA,
-- so it's still one rule stated four times, not four different rules.

alter table character_classes enable row level security;
create policy "character_classes_all" on character_classes for all to authenticated
  using (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id))
  with check (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id));

alter table character_skills enable row level security;
create policy "character_skills_all" on character_skills for all to authenticated
  using (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id))
  with check (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id));

alter table character_features enable row level security;
create policy "character_features_all" on character_features for all to authenticated
  using (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id))
  with check (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id));

alter table character_bags enable row level security;
create policy "character_bags_all" on character_bags for all to authenticated
  using (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id))
  with check (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id));

alter table character_items enable row level security;
create policy "character_items_all" on character_items for all to authenticated
  using (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id))
  with check (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id));

alter table character_spells enable row level security;
create policy "character_spells_all" on character_spells for all to authenticated
  using (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id))
  with check (is_campaign_dm(character_campaign_id(character_id)) or owns_character(character_id));

-- One level deeper — keyed by character_bag_id, not character_id directly.
alter table character_bag_pocket_overrides enable row level security;
create policy "character_bag_pocket_overrides_all" on character_bag_pocket_overrides for all to authenticated
  using (
    is_campaign_dm(character_campaign_id(bag_owner_character_id(character_bag_id)))
    or owns_character(bag_owner_character_id(character_bag_id))
  )
  with check (
    is_campaign_dm(character_campaign_id(bag_owner_character_id(character_bag_id)))
    or owns_character(bag_owner_character_id(character_bag_id))
  );

-- ---------------------------------------------------------------------------
-- DM tools — Bag of Holding & item transfers
-- ---------------------------------------------------------------------------

alter table bag_of_holding enable row level security;

create policy "bag_of_holding_select_members" on bag_of_holding
  for select to authenticated using (is_campaign_member(campaign_id));

create policy "bag_of_holding_insert_dm_only" on bag_of_holding
  for insert to authenticated with check (is_campaign_dm(campaign_id));

create policy "bag_of_holding_delete_dm_only" on bag_of_holding
  for delete to authenticated using (is_campaign_dm(campaign_id));

-- Update is the "claim" action: the DM can always edit a row, and a
-- player can only move a claimable item onto one of THEIR OWN characters
-- — the with-check clause is what stops a player claiming loot onto
-- someone else's character.
create policy "bag_of_holding_update_dm_or_claim" on bag_of_holding
  for update to authenticated
  using (is_campaign_dm(campaign_id) or (is_claimable_by_players and is_campaign_member(campaign_id)))
  with check (is_campaign_dm(campaign_id) or owns_character(claimed_by_character_id));

alter table item_transfers enable row level security;

create policy "item_transfers_select_participants" on item_transfers
  for select to authenticated
  using (
    owns_character(from_character_id)
    or owns_character(to_character_id)
    or is_campaign_dm(character_campaign_id(from_character_id))
  );

create policy "item_transfers_insert_sender" on item_transfers
  for insert to authenticated with check (owns_character(from_character_id));

-- Either side can update (sender cancels, recipient accepts/declines).
create policy "item_transfers_update_participants" on item_transfers
  for update to authenticated
  using (owns_character(from_character_id) or owns_character(to_character_id));

-- ---------------------------------------------------------------------------
-- Journal, handouts, rest events
-- ---------------------------------------------------------------------------

alter table journal_entries enable row level security;

-- Visibility rule from spec Module 7: DM sees everything; a party member
-- sees public entries; a private_player entry is visible only to its
-- author (and the DM, already covered above). dm_only entries are
-- implicitly excluded from the public/private_player clauses, so only
-- the DM branch matches them.
create policy "journal_entries_select_by_visibility" on journal_entries
  for select to authenticated
  using (
    is_campaign_dm(campaign_id)
    or (visibility = 'public' and is_campaign_member(campaign_id))
    or (visibility = 'private_player' and owns_character(author_character_id))
  );

create policy "journal_entries_insert_members" on journal_entries
  for insert to authenticated
  with check (
    is_campaign_dm(campaign_id)
    or (owns_character(author_character_id) and visibility <> 'dm_only')
  );

create policy "journal_entries_update_dm_or_author" on journal_entries
  for update to authenticated
  using (is_campaign_dm(campaign_id) or owns_character(author_character_id));

create policy "journal_entries_delete_dm_or_author" on journal_entries
  for delete to authenticated
  using (is_campaign_dm(campaign_id) or owns_character(author_character_id));

alter table handouts enable row level security;

-- An un-revealed handout is DM-only (it's sitting in the gallery waiting
-- to be broadcast); once revealed, the whole party can see it.
create policy "handouts_select_dm_or_revealed" on handouts
  for select to authenticated
  using (is_campaign_dm(campaign_id) or (is_revealed and is_campaign_member(campaign_id)));

create policy "handouts_write_dm_only" on handouts
  for all to authenticated
  using (is_campaign_dm(campaign_id)) with check (is_campaign_dm(campaign_id));

alter table active_meals enable row level security;

create policy "active_meals_select_members" on active_meals
  for select to authenticated using (is_campaign_member(campaign_id));

create policy "active_meals_insert_delete_dm_only" on active_meals
  for insert to authenticated with check (is_campaign_dm(campaign_id));

create policy "active_meals_delete_dm_only" on active_meals
  for delete to authenticated using (is_campaign_dm(campaign_id));

-- Members can update (contributing to the communal pot mid-meal), not
-- just the DM. RLS can't practically restrict this to "only the
-- communal_pot column" — if that granularity ever matters, it becomes a
-- Postgres function (RPC) instead of a raw table update. Not needed yet
-- (YAGNI): nothing about the current design is harmed by a player being
-- able to edit the whole row, since the only players in a position to do
-- so are already trusted members of this specific campaign.
create policy "active_meals_update_members" on active_meals
  for update to authenticated using (is_campaign_member(campaign_id));
