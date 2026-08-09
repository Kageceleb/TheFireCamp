-- Starting reference data for classes_catalog and skill_definitions.
-- Both tables are DM-extensible per spec (Module 10 / Section 7) — this
-- is a sane default set, not a locked list. A DM can add homebrew
-- classes/skills, or edit these, straight through the same tables.

insert into classes_catalog (name, theme_color, hit_die, description) values
  ('Barbarian', '#B3492F', 12, 'A fierce warrior who can enter a battle rage.'),
  ('Bard',      '#6B4A72', 8,  'An inspiring magician whose power echoes the music of creation.'),
  ('Cleric',    '#E8C874', 8,  'A priestly champion who wields divine magic.'),
  ('Druid',     '#5C7A5E', 8,  'A priest of the Old Faith, wielding the powers of nature.'),
  ('Fighter',   '#5B6472', 10, 'A master of martial combat, skilled with a variety of weapons and armor.'),
  ('Monk',      '#A0813F', 8,  'A master of martial arts, harnessing the power of the body.'),
  ('Paladin',   '#C9A86A', 10, 'A holy warrior bound to a sacred oath.'),
  ('Ranger',    '#3F7B78', 10, 'A warrior who uses martial prowess and nature magic to combat threats.'),
  ('Rogue',     '#3D434D', 8,  'A scoundrel who uses stealth and trickery to overcome obstacles.'),
  ('Sorcerer',  '#8A4A35', 6,  'A spellcaster who draws on inherent magic from a gift or bloodline.'),
  ('Warlock',   '#493251', 8,  'A wielder of magic derived from a bargain with an extraplanar entity.'),
  ('Wizard',    '#2A5451', 6,  'A scholarly magic-user capable of manipulating the structures of reality.');

insert into skill_definitions (name, governing_ability) values
  ('Acrobatics',      'dexterity'),
  ('Animal Handling',  'wisdom'),
  ('Arcana',            'intelligence'),
  ('Athletics',         'strength'),
  ('Deception',         'charisma'),
  ('History',           'intelligence'),
  ('Insight',           'wisdom'),
  ('Intimidation',      'charisma'),
  ('Investigation',     'intelligence'),
  ('Medicine',          'wisdom'),
  ('Nature',            'intelligence'),
  ('Perception',        'wisdom'),
  ('Performance',       'charisma'),
  ('Persuasion',        'charisma'),
  ('Religion',          'intelligence'),
  ('Sleight of Hand',   'dexterity'),
  ('Stealth',           'dexterity'),
  ('Survival',          'wisdom');
