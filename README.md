# The Camp Fire — build log

Built against **spec v5**, now on **Supabase** (Postgres + Auth + Storage +
Realtime) instead of Firebase, after discovering Firebase SQL Connect has
no free tier for the actual database compute. See the "Why Supabase"
section below for the reasoning.

## What's actually in this delivery

```
supabase/migrations/0001_initial_schema.sql  — every table (bags, pockets,
                                                 items, spells, characters...)
supabase/migrations/0002_rls_policies.sql    — Row Level Security: the
                                                 DM/player permission model,
                                                 enforced by Postgres itself
src/lib/supabase/client.ts                   — Supabase client setup
src/lib/supabase/campaigns.ts                — campaign create/join/list,
                                                 replaces the old .gql ops
src/lib/grid/                                — pocket packing (unchanged)
src/lib/encumbrance/                         — carry-weight calc (unchanged)
src/lib/character/                           — stat math (unchanged)
  */__tests__/                               — unit tests for all of the above
.env.example                                 — copy to .env, fill in your
                                                 Supabase project's URL/key
```

The `src/lib/grid`, `src/lib/encumbrance`, and `src/lib/character` modules
from the previous session are completely untouched — they're pure logic
with no database dependency, so nothing about switching backends affects
them. That's the payoff of keeping them isolated in the first place.

## Why Supabase

Firebase's SQL product (Data Connect / "SQL Connect") provisions a real
Cloud SQL Postgres instance behind the scenes, and Cloud SQL is always a
metered, paid resource — there's no free tier for the compute itself, only
short-lived trial credit. Supabase bundles Postgres + Auth + Storage +
Realtime into one product with a free tier that's a genuine fit for this
project's actual scale (500 MB database, 50k monthly active users, 200
concurrent realtime connections, $0/month). The one thing to know: a free
project auto-pauses after 7 days with no activity and needs a manual
"resume" click in the dashboard — not a problem during active development,
just something to expect if the project sits untouched for a couple of
weeks.

## Setup — no CLI needed

Last session's instructions used the Firebase CLI's automated installer,
which failed on your Windows/mingw64 setup. Supabase's dashboard lets you
skip a local CLI entirely for this stage, which sidesteps that whole class
of problem:

1. **Create a project** at [supabase.com](https://supabase.com) — new
   organization if you don't have one, then "New Project."
2. **Run the schema.** In the project dashboard, open the **SQL Editor**,
   paste in the full contents of `supabase/migrations/0001_initial_schema.sql`,
   and click **Run**. Then do the same with
   `supabase/migrations/0002_rls_policies.sql` (order matters — the second
   file's policies reference tables the first one creates).
3. **Enable Google sign-in.** Dashboard → **Authentication** → **Providers**
   → enable **Google**, following Supabase's prompt for the Google Cloud
   OAuth credentials.
4. **Get your API keys.** Dashboard → **Settings** → **API** — copy the
   **Project URL** and the **anon public** key.
5. **Configure the app.** Copy `.env.example` to `.env` and paste those two
   values in.
6. **Install and run:**
   ```
   npm install
   npm test
   npm run dev
   ```

Once you're comfortable with the dashboard flow, the Supabase CLI (for
local Docker-based development, migrations-as-code, etc.) is a nice
upgrade — but it's genuinely optional to get started, unlike the Firebase
tooling we hit trouble with.

## A limitation worth knowing about (still true)

This sandbox still has no network access, so — same as last session — I
could not run `npm install` or execute the tests/SQL myself. The SQL in
both migration files is written carefully and I traced the RLS logic by
hand against the intended permission model, but please actually run the
migrations against a real Supabase project and confirm `npm test` is
still green before building further on top of this.

## Roadmap — what's next

1. Run the two migration files against your new Supabase project (Setup
   step 2 above) and confirm no errors.
2. Auth UI — Google sign-in via `supabase.auth.signInWithOAuth`, wired to
   the `listMyCampaigns` / `createCampaign` / `joinCampaign` functions
   already written in `src/lib/supabase/campaigns.ts`.
3. Character sheet UI — wire the stat math to real forms and the
   segmented-indicator visuals (Exhaustion, Death Saves) from spec Module 10.
4. Bag/pocket UI — drag-and-drop grid rendering on top of `src/lib/grid`,
   plus the DM's bag-type editor.
5. Symbiote integration — `dice.putDiceInTray` / `onRollResults` for
   macros, `chat.sendAsCreature` for narration, boot hydration.
6. Catalogs (items/spells/classes) management UI, the Bag of Holding +
   loot claim flow, Journal/Handouts, the Banquet/rest event.

Whenever you're ready, tell me which piece of the roadmap to pick up.
