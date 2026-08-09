-- Bug fix / missing piece: the original master spec's item schema
-- always included "validSlots" alongside category and typeAttributes —
-- which body slot(s) an item can be equipped to — but it never made it
-- into the actual Postgres schema. Without it there's no way to know
-- a Shield goes to OffHand and a chest piece goes to Torso, as opposed
-- to a rope or a potion which can't be equipped anywhere at all.

alter table items_catalog
  add column valid_slots text[] not null default '{}';
