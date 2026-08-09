-- Seeds the two catalogs character creation depends on. These are DM-
-- editable afterward like any other catalog row (see the RLS policies in
-- 0002) — this just gives every campaign a sensible starting point
-- instead of an empty dropdown.

insert into classes_catalog (name, theme_color, hit_die, description) values
  ('Barbarian', '#b3492f', 12, null),
  ('Bard',      '#6b4a72', 8,  null),
  ('Cleric',    '#c9a86a', 8,  null),
  ('Druid',     '#5c7a5e', 8,  null),
  ('Fighter',   '#5b6472', 10, null),
  ('Monk',      '#3f7b78', 8,  null),
  ('Paladin',   '#a0813f', 10, null),
  ('Ranger',    '#3d5440', 10, null),
  ('Rogue',     '#2a2f3a', 8,  null),
  ('Sorcerer',  '#8a4a35', 6,  null),
  ('Warlock',   '#493251', 8,  null),
  ('Wizard',    '#4a7c74', 6,  null);

insert into skill_definitions (name, governing_ability) values
  ('Acrobatics',      'dexterity'),
  ('Animal Handling',  'wisdom'),
  ('Arcana',           'intelligence'),
  ('Athletics',        'strength'),
  ('Deception',        'charisma'),
  ('History',          'intelligence'),
  ('Insight',          'wisdom'),
  ('Intimidation',     'charisma'),
  ('Investigation',    'intelligence'),
  ('Medicine',         'wisdom'),
  ('Nature',           'intelligence'),
  ('Perception',       'wisdom'),
  ('Performance',      'charisma'),
  ('Persuasion',       'charisma'),
  ('Religion',         'intelligence'),
  ('Sleight of Hand',  'dexterity'),
  ('Stealth',          'dexterity'),
  ('Survival',         'wisdom');
