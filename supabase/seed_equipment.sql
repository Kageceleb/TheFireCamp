-- Run this once, after seed_bags.sql (which you've already run — this
-- file only UPDATEs those existing rows and adds one new item, it
-- doesn't re-insert bag types/pockets, so it's safe to run on top of
-- what's already there).

update items_catalog set valid_slots = '{MainHand}' where name = 'Longsword';

update items_catalog
  set valid_slots = '{OffHand}', type_attributes = '{"shieldBonus": 2}'::jsonb
  where name = 'Shield, steel';

-- A Torso-slot piece, so there's something to demonstrate the normal
-- base-AC-plus-capped-Dex formula alongside the Shield's flat bonus.
insert into items_catalog
  (name, category, description, base_weight_kg, stack_size, grid_width, grid_height, valid_slots, type_attributes)
values (
  'Leather Armor', 'armor', 'Light armor of tough but flexible leather.', 5.0, 1, 2, 2,
  '{Torso}', '{"baseAc": 11, "dexCap": null}'::jsonb
);
