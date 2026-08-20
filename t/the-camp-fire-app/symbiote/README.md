# Installing The Camp Fire as a TaleSpire Symbiote

This can only be genuinely tested **inside TaleSpire itself** — none of
this works from a normal browser tab, by design (a Symbiote is a web
view embedded inside the game).

## One-time TaleSpire setup

1. In TaleSpire's settings, enable **Symbiotes** (there's a toggle for
   the feature — see the in-game modding settings page).
2. Still in settings, enable **Symbiote debugging / development mode**.
   This is what lets file changes reload live and lets you attach
   Chrome's dev tools to the embedded browser.

## Installing this Symbiote for local development

1. Open the Symbiotes folder — either navigate manually to
   `%AppData%\..\LocalLow\BouncyRock Entertainment\TaleSpire\Symbiotes\`
   or click **"Open Symbiotes Directory"** in the game's settings or the
   Symbiotes side panel.
2. Create a new folder in there, e.g. `the_camp_fire`.
3. Copy **`manifest.dev.json`** into that folder and rename it to
   `manifest.json`. This version's `entryPoint` points at
   `http://localhost:5173` — your own Vite dev server — so make sure
   `npm run dev` is actually running before you open the Symbiote in
   TaleSpire.
4. Open TaleSpire, open the Symbiotes panel, and "The Camp Fire" should
   appear. Click it to load your running dev app inside the game.

Any time you save a code change, the dev server hot-reloads exactly like
it does in a browser tab — this is a real webview, not a screenshot.

## What to actually test

- **Connection status**: the Campaign Hub screen shows a small status
  badge — it should say "Connected to TaleSpire" once the Symbiote
  loads and TaleSpire's `hasInitialized` event fires. If it's stuck on
  "Checking…" or shows "Standalone," something's wrong with the
  manifest or the API injection — check the debugging console (below)
  for errors first.
- **Dice rolling**: open a character sheet and click any 🎲 button —
  Initiative, an ability check, a save, or a skill. This should put a
  real die (or dice) in TaleSpire's physical tray; roll it, and the
  sheet should show the result under "🎲 [label]: [total]" and the roll
  should also get narrated into TaleSpire's chat. If a button does
  nothing, first confirm the status badge says "Connected" — the dice
  code silently falls back to a locally-simulated roll (logged to the
  console) when it isn't.
- **Google sign-in**: this is the one I genuinely can't be certain
  about without watching it happen. The manifest already sets
  `"loadTargetBehavior": "popup"`, which is TaleSpire's documented fix
  for third-party login popups (Google's OAuth flow opens a new
  tab/popup, which Symbiotes block by default unless this is set) —
  but I haven't been able to verify it end-to-end myself. If sign-in
  doesn't work on the first try, that setting is the first thing to
  double check.

## Debugging

With debugging enabled (step 2 above), connect an external Chrome
browser to `localhost:8080` to get real dev tools — console, network
tab, breakpoints — attached to the Symbiote's embedded browser.

## Going from "my dev server" to "something my players can actually use"

`http://localhost:5173` only exists on **your** machine — it's not
reachable by anyone else's TaleSpire client. For your players to use
this, the app needs to be deployed somewhere public (e.g. Vercel,
Netlify), and each player needs `manifest.production.json` (with the
`entryPoint` filled in with your real deployed URL) installed in their
own Symbiotes folder the same way described above. That's a step for
later — `manifest.dev.json` is all you need to keep testing locally for
now.
