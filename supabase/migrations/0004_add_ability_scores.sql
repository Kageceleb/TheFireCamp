-- Bug fix: spec v5 Module 9 calls for "the 6 ability scores, each paired
-- with its own saving throw proficiency flag right on the score" living
-- on the character — but the original schema (0001) never actually added
-- these columns. This went unnoticed until character creation needed
-- them. Adding them now rather than reworking the table shape further.
--
-- Column names use the _score suffix (strength_score, not strength) to
-- match what the application code already expects.

alter table characters
  add column strength_score int not null default 10,
  add column dexterity_score int not null default 10,
  add column constitution_score int not null default 10,
  add column intelligence_score int not null default 10,
  add column wisdom_score int not null default 10,
  add column charisma_score int not null default 10,
  add column strength_save_proficient boolean not null default false,
  add column dexterity_save_proficient boolean not null default false,
  add column constitution_save_proficient boolean not null default false,
  add column intelligence_save_proficient boolean not null default false,
  add column wisdom_save_proficient boolean not null default false,
  add column charisma_save_proficient boolean not null default false;
