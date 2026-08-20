-- The Camp Fire — core schema (Supabase / Postgres)
--
-- This is a straight conversion of the relational design from spec v5 —
-- same tables, same relationships — into plain Postgres DDL instead of
-- Data Connect's GraphQL SDL. Two things genuinely improve by being on
-- raw Postgres rather than translated:
--   1. jsonb is used natively (items_catalog.type_attributes, etc.)
--      instead of the JSON-string-in-a-text-column workaround the
--      Data Connect version needed.
--   2. `default auth.uid()` on ownership columns (campaign_members.user_id,
--      characters.user_id) means the client never has to fetch and pass
--      the current user's id — Postgres fills it in itself, and RLS
--      (see 0002_rls_policies.sql) checks it against auth.uid() directly.

-- ---------------------------------------------------------------------------
-- Eras & Campaigns
-- ---------------------------------------------------------------------------

create table eras (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active_era_id uuid references eras (id),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create type campaign_role as enum ('DM', 'PLAYER');

-- The app's OWN permission system — deliberately independent of any VTT's
-- native roles, so integrating a different VTT later doesn't require a
-- rearchitecture. See spec v5 Section 4.
create table campaign_members (
  campaign_id uuid not null references campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) default auth.uid(),
  role campaign_role not null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Global catalogs — shared across every campaign, DM-extensible/homebrewable
-- ---------------------------------------------------------------------------

create table items_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  base_weight_kg numeric(6, 2) not null default 0,
  -- Minimum 1, never 0 — 1 means the item doesn't stack.
  stack_size int not null default 1 check (stack_size >= 1),
  image_url text,
  -- Category-specific data (AC base + Dex cap for armor, damage dice for
  -- weapons, etc.) — genuinely heterogeneous per row, not a fixed shape
  -- being avoided out of laziness, so jsonb is the right tool here.
  type_attributes jsonb
);

create table classes_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  theme_color text not null,
  hit_die int not null,
  description text
);

create table skill_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Plain text rather than an enum so a DM can add a homebrew skill
  -- without a schema migration.
  governing_ability text not null
);

-- ---------------------------------------------------------------------------
-- Spellcasting & multi-era magic
-- ---------------------------------------------------------------------------

create table spells_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_level int not null,
  school text,
  casting_time text not null,
  components_vsm text not null,
  material_components text,
  description text,
  requires_concentration boolean not null default false
);

-- A spell only exists in a given era through an override of a base entry —
-- confirmed in spec v5 as override-based, not a full catalog fork.
create table spell_era_overrides (
  id uuid primary key default gen_random_uuid(),
  base_spell_id uuid not null references spells_catalog (id) on delete cascade,
  era_id uuid not null references eras (id) on delete cascade,
  level_override int,
  casting_time_override text,
  materials_override text,
  description_override text,
  is_banned_in_era boolean not null default false,
  unique (base_spell_id, era_id)
);

-- ---------------------------------------------------------------------------
-- Bag types & pockets — DM-authored templates
-- ---------------------------------------------------------------------------

create type pocket_packing_type as enum ('GRID', 'UNIFORM_SLOTS');

create table bag_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Which equipment body slot this bag occupies when worn (Back, Belt, Cloak...)
  body_slot text not null,
  base_weight_kg numeric(6, 2) not null default 0
);

create table pocket_templates (
  id uuid primary key default gen_random_uuid(),
  bag_type_id uuid not null references bag_types (id) on delete cascade,
  name text not null,
  packing_type pocket_packing_type not null default 'GRID',
  -- Only meaningful when packing_type = GRID
  grid_width int,
  grid_height int,
  -- Only meaningful when packing_type = UNIFORM_SLOTS
  slot_count int,
  -- Optional restriction, e.g. Glass Pocket only accepts "flask" category items
  allowed_category text
);

-- ---------------------------------------------------------------------------
-- Characters
-- ---------------------------------------------------------------------------

create table characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) default auth.uid(),
  name text not null,
  race text not null,
  background text,
  -- Player-picked overall sheet theme. Icons/markers for every class the
  -- character has taken still always render regardless of this choice.
  main_theme_class_id uuid references classes_catalog (id),
  hp_max int not null,
  hp_current int not null,
  hp_temp int not null default 0,
  exhaustion int not null default 0 check (exhaustion between 0 and 6),
  death_save_successes int not null default 0 check (death_save_successes between 0 and 3),
  death_save_failures int not null default 0 check (death_save_failures between 0 and 3),
  speed_meters numeric(5, 2) not null,
  wallet_cp int not null default 0,
  wallet_sp int not null default 0,
  wallet_ep int not null default 0,
  wallet_gp int not null default 0,
  wallet_pp int not null default 0
);

-- Multiclass support — one row per class the character has taken.
create table character_classes (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  class_id uuid not null references classes_catalog (id),
  subclass text,
  level int not null check (level between 1 and 20),
  unique (character_id, class_id)
);

-- Thin per-character state — the skill's name/governing ability lives once
-- in skill_definitions, not duplicated per character.
create table character_skills (
  character_id uuid not null references characters (id) on delete cascade,
  skill_id uuid not null references skill_definitions (id),
  is_proficient boolean not null default false,
  has_expertise boolean not null default false,
  primary key (character_id, skill_id)
);

create table character_features (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  name text not null,
  -- Which class/race/subclass granted this (drives the class-specific icon)
  source text not null,
  description text,
  icon_ref text,
  -- Null = unlimited / not a limited-use feature
  uses_per_rest int,
  current_uses int,
  -- Optional custom roll formula, e.g. "2d8+3"
  custom_macro text
);

-- One row per bag a character is currently carrying — a character can
-- carry several at once (backpack + belt pouch + cape).
create table character_bags (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  bag_type_id uuid not null references bag_types (id),
  equipped_slot text not null,
  is_weightless boolean not null default false,
  bonus_capacity_kg numeric(6, 2) not null default 0
);

-- Per-instance override of one pocket on one carried bag — lets a character
-- resize or remove a pocket without the DM defining a whole new bag type.
create table character_bag_pocket_overrides (
  character_bag_id uuid not null references character_bags (id) on delete cascade,
  pocket_template_id uuid not null references pocket_templates (id),
  grid_width int,
  grid_height int,
  slot_count int,
  is_removed boolean not null default false,
  primary key (character_bag_id, pocket_template_id)
);

create table character_items (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  catalog_item_id uuid not null references items_catalog (id),
  -- Null when the item is equipped directly rather than sitting in a pocket
  character_bag_id uuid references character_bags (id) on delete cascade,
  pocket_template_id uuid references pocket_templates (id),
  -- Grid-pocket placement — null for uniform-slot pockets
  grid_x int,
  grid_y int,
  -- Uniform-slot placement — null for grid pockets
  slot_index int,
  quantity int not null default 1 check (quantity >= 1),
  is_equipped boolean not null default false,
  equipped_slot text
);

create table character_spells (
  character_id uuid not null references characters (id) on delete cascade,
  spell_id uuid not null references spells_catalog (id),
  is_known boolean not null default true,
  is_prepared boolean not null default false,
  is_concentrating boolean not null default false,
  primary key (character_id, spell_id)
);

-- ---------------------------------------------------------------------------
-- DM tools
-- ---------------------------------------------------------------------------

create table bag_of_holding (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  catalog_item_id uuid not null references items_catalog (id),
  quantity int not null default 1,
  dropped_by_character_id uuid references characters (id),
  is_claimable_by_players boolean not null default false,
  claimed_by_character_id uuid references characters (id),
  dropped_at timestamptz not null default now()
);

create table item_transfers (
  id uuid primary key default gen_random_uuid(),
  from_character_id uuid not null references characters (id),
  to_character_id uuid not null references characters (id),
  catalog_item_id uuid not null references items_catalog (id),
  quantity int not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  requested_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Journal, handouts, rest events
-- ---------------------------------------------------------------------------

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  author_character_id uuid references characters (id) on delete set null,
  category text not null,
  title text not null,
  content text,
  visibility text not null default 'public' check (visibility in ('public', 'dm_only', 'private_player')),
  created_at timestamptz not null default now()
);

create table handouts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  title text not null,
  description text,
  image_url text not null,
  category text not null default 'general',
  is_revealed boolean not null default false,
  created_at timestamptz not null default now()
);

create table active_meals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  is_active boolean not null default true,
  communal_pot jsonb,
  mechanics_data jsonb
);
