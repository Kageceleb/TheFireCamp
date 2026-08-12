# The Camp Fire — build log

Built against **spec v5**, now on **Supabase** (Postgres + Auth + Storage +
Realtime) instead of Firebase, after discovering Firebase SQL Connect has
no free tier for the actual database compute. See the "Why Supabase"
section below for the reasoning.

## What's actually in this delivery

```
supabase/                                    — schema, RLS policies, seeds
src/lib/supabase/                            — client, auth, campaigns,
                                                 catalogs, characters,
                                                 bags, equipment
src/lib/symbiote/                            — TaleSpire Symbiote bridge:
                                                 client.ts (connection
                                                 status, chat, dice rolling)
                                                 + talespireTypes.ts
symbiote/                                    — manifest.dev.json /
                                                 manifest.production.json +
                                                 install/testing instructions
                                                 for actually running this
                                                 inside TaleSpire
src/lib/grid/                                — pocket packing (unchanged)
src/lib/encumbrance/                         — carry-weight calc (unchanged)
src/lib/character/                           — stat math (unchanged)
  */__tests__/                               — unit tests for all of the above
src/components/                              — SignIn, CampaignHub,
                                                 CampaignView, character
                                                 creation, character sheet
                                                 with dice-roll buttons,
                                                 bags, equipment
.env.example                                 — copy to .env, fill in your
                                                 Supabase project's URL/key
```

**Run, in order, if you haven't already:** `0001`, `0002`, `0003` (from last
session), then the two new ones this session — `0004_add_ability_scores.sql`
and `seed.sql`. Skipping the seed file means the character creation
screen's class dropdown will be empty.

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
could not run `npm install` or execute the tests/SQL myself. The SQL and
TypeScript in this delivery is written carefully and I traced the logic
by hand (including re-reading every file this session touched end-to-end
to confirm they actually call each other correctly — see the transparency
note below for why that mattered more than usual this time), but please
actually run the migrations against a real Supabase project and confirm
`npm test` is still green before building further on top of this.

## Roadmap — what's next

1. ~~Run the migrations~~ — done, campaigns confirmed working.
2. ~~Auth UI~~ — done.
3. ~~Character sheet UI~~ — done: campaign view, character creation
   (with multiclass support at creation), and the sheet itself.
4. ~~Bag/pocket UI~~ — done: drag-and-drop grid pockets, uniform-slot
   pockets, adding bags/items, encumbrance.
5. ~~Equipping items~~ — done: equip/unequip, and AC is computed for
   real from whatever's equipped in Torso and OffHand.
6. ~~Symbiote integration~~ — done: TaleSpire's type definitions, the
   dev/production manifests, the global-handler bridge (see below), chat
   narration, and — it turned out to already be mostly built from an
   earlier interrupted session, see the transparency note below — real
   dice-roll buttons (🎲) wired into Initiative, every ability check,
   every saving throw, and every skill on the character sheet. A status
   badge on the Campaign Hub screen confirms whether the app is actually
   connected to TaleSpire. See `symbiote/README.md` for how to actually
   install and test this inside TaleSpire — it can't be verified from a
   plain browser tab.
7. DM item/spell catalog management UI (so the DM doesn't need to write
   SQL to add new items), the Bag of Holding + loot claim flow,
   Journal/Handouts, the Banquet/rest event.

## How the Symbiote bridge works

TaleSpire delivers events by calling a **global function by name**,
declared in the manifest — it cannot call into a React closure or a
module-private variable directly (the official docs are explicit about
this: such a handler "is not visible to the API invoking the handler
and delivery of the event will fail"). `src/lib/symbiote/client.ts`
handles this directly: it assigns `window.handleSymbioteStateChange` and
`window.handleRollResult` once at module load — imported for its side
effect at the very top of `main.tsx`, before anything else runs — and
those functions update small internal state (a `hasInitialized` flag
with waiting callbacks, and a map of pending roll promises keyed by
`rollId`) that the module's exported functions (`waitForSymbioteReady`,
`rollDice`, `sendChatMessage`) read from and resolve. No separate
event-bus abstraction on top of that — the global assignment already
gives every part of the app that imports from `client.ts` a normal
function to call.

`talespireTypes.ts` is the hand-written type file for `window.TS` —
there's no npm package for this, since TaleSpire injects the object into
the page at runtime rather than it being a library you install.

`RollButton.tsx` is one small component — one button, one formula, one
roll — used everywhere a 🎲 appears on the sheet. It calls `rollDice()`,
reports the total back up to the sheet, and narrates the result into
TaleSpire's chat, attributed to the character by name.

Nothing in `src/lib/symbiote/` will actually connect to anything while
running via `npm run dev` in a normal browser tab — `window.TS` simply
won't exist there, and every function gracefully falls back (roll
buttons simulate a local roll, chat messages log to the console, the
status badge shows "Standalone"). That's intentional: normal web
development stays normal, and the honest badge tells you which mode
you're in. See `symbiote/README.md` for how to actually load this
inside TaleSpire to test the real connection.

## A transparency note on this session specifically

You asked me to split this into two parts because of two earlier failed
attempts, so I started this session narrowly (connection status + chat
only, no dice). Partway through, I found that those earlier attempts
had actually left behind a substantially complete implementation —
including a working dice engine and roll buttons already wired into the
character sheet — that just hadn't been fully connected together (a
duplicate import in `main.tsx`, a manifest missing the dice subscription
its own handler needed, and a parallel/redundant version of the
connection-status code that I'd started building myself before
realizing the better one already existed).

Rather than either (a) ignore that work and rebuild a smaller version
from scratch, or (b) silently ship it without checking it, I read
through the entire chain this session — schema column names, every
function signature, every prop passed between components — to confirm
it actually holds together, fixed the real bugs I found, and removed my
own redundant duplicate work in favor of the better existing version.
That's why this delivery covers more than originally scoped: the honest
result of checking turned out to be "this was already mostly done,"
not "let's also build the next part while we're at it."
