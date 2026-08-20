-- Bug fix: every catalog item needs a grid footprint (width/height in
-- slots) to be placeable in a grid pocket at all — this isn't
-- category-specific data like AC or damage dice, it's universal to
-- every item, so it belongs as real columns rather than buried inside
-- type_attributes (same reasoning that kept type_attributes itself
-- jsonb in the first place: only genuinely heterogeneous data goes
-- there, and a footprint isn't that).

alter table items_catalog
  add column grid_width int not null default 1 check (grid_width >= 1),
  add column grid_height int not null default 1 check (grid_height >= 1);
