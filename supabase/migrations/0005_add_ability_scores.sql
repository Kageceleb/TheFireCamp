-- Spec v5 Module 9 calls for the six ability scores as plain manual
-- fields, each paired with its own saving-throw proficiency flag (that
-- pairing was a deliberate improvement over an early example character
-- that stored saves in a separate, disagreeing block — see the v3 spec
-- appendix). Somehow neither ever made it into the actual table —
-- caught while building the character sheet UI, fixed here.

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
