-- Gives every campaign a working starting point for the bag/pocket
-- system, same spirit as seed.sql for classes/skills — DM-editable
-- afterward, not locked in.

-- The default "Traveler's Backpack" bag type, worn on the Back slot,
-- with the original 6-pocket layout from spec Module 2. Bedroll is
-- sized 4x6 specifically to fit a 2x6 sleeping bag and a 2x6 blanket
-- side by side, the worked example from early design discussion.
with new_bag_type as (
  insert into bag_types (name, body_slot, base_weight_kg)
  values ('Traveler''s Backpack', 'Back', 1.5)
  returning id
)
insert into pocket_templates (bag_type_id, name, packing_type, grid_width, grid_height, slot_count, allowed_category)
select id, 'Main Pocket', 'GRID'::pocket_packing_type, 6, 4, null, null from new_bag_type
union all
select id, 'Glass Pocket', 'UNIFORM_SLOTS'::pocket_packing_type, null, null, 6, 'flask' from new_bag_type
union all
select id, 'Rations Pocket', 'GRID'::pocket_packing_type, 4, 2, null, 'food' from new_bag_type
union all
select id, 'Bedroll Pocket', 'GRID'::pocket_packing_type, 4, 6, null, null from new_bag_type
union all
select id, 'Special Pouch', 'GRID'::pocket_packing_type, 3, 3, null, null from new_bag_type;

-- A Belt Pouch as a second bag type, to show the "carry more than one
-- bag" system working — worn on the Belt slot, one small uniform-slot
-- pocket for coins/trinkets.
with belt_pouch as (
  insert into bag_types (name, body_slot, base_weight_kg)
  values ('Belt Pouch', 'Belt', 0.2)
  returning id
)
insert into pocket_templates (bag_type_id, name, packing_type, grid_width, grid_height, slot_count, allowed_category)
select id, 'Pouch', 'UNIFORM_SLOTS'::pocket_packing_type, null, null, 4, null from belt_pouch;

-- Starter items — enough variety to exercise both packing types and a
-- couple of different footprints.
insert into items_catalog (name, category, description, base_weight_kg, stack_size, grid_width, grid_height) values
  ('Longsword', 'weapon', 'A versatile martial blade.', 1.5, 1, 3, 1),
  ('Shield, steel', 'armor', 'A sturdy round shield.', 3.0, 1, 2, 2),
  ('Potion of Healing', 'flask', 'Restores hit points when consumed.', 0.25, 5, 1, 1),
  ('Rope, 15 meters', 'gear', 'Sturdy hempen rope.', 4.5, 1, 1, 2),
  ('Rations (1 day)', 'food', 'Preserved travel food for one day.', 1.0, 10, 1, 1),
  ('Sleeping Bag', 'gear', 'Standard bedroll sleeping bag.', 3.0, 1, 2, 6),
  ('Blanket', 'gear', 'A warm wool blanket.', 1.5, 1, 2, 6),
  ('Gold Pieces', 'currency', 'Standard coinage.', 0.01, 50, 1, 1);
