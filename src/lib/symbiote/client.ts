import "./talespireTypes";
import type { RollDescriptor, RollResultsPayload } from "./talespireTypes";

/**
 * Tip: check this before relying on any TaleSpire-specific behavior.
 * True only when actually running inside TaleSpire's embedded Symbiote
 * webview; false during normal browser development, where every
 * function in this module degrades to a clearly-labeled simulated
 * fallback instead of throwing.
 */
export function isRunningInTaleSpire(): boolean {
  return typeof window !== "undefined" && !!window.TS;
}

let hasInitialized = false;
const readyWaiters: Array<() => void> = [];

/**
 * Tip: TaleSpire's API finishes injecting asynchronously after page
 * load. Await this before the FIRST real API call in a session — it
 * resolves once the "hasInitialized" event has actually fired (or
 * immediately if it already has, or immediately when running
 * standalone, since there's nothing to wait for).
 */
export function waitForSymbioteReady(): Promise<void> {
  if (!isRunningInTaleSpire() || hasInitialized) return Promise.resolve();
  return new Promise((resolve) => readyWaiters.push(resolve));
}

// ---------------------------------------------------------------------------
// Global event handlers — see the comment on these in talespireTypes.ts for
// why they have to be real `window` properties, assigned once here at
// module load, rather than functions scoped to this module.
// ---------------------------------------------------------------------------

window.handleSymbioteStateChange = (event) => {
  if (event.kind === "hasInitialized") {
    hasInitialized = true;
    readyWaiters.splice(0).forEach((resolve) => resolve());
  }
  // willEnterBackground / hasEnteredForeground / willShutdown aren't
  // handled yet — this app doesn't request the runInBackground
  // capability, so those events don't apply to it (YAGNI).
};

interface PendingRoll {
  resolve: (total: number) => void;
  reject: (error: Error) => void;
}
const pendingRolls = new Map<string, PendingRoll>();

window.handleRollResult = (event) => {
  if (event.kind === "rollResults") {
    const payload = event.payload as RollResultsPayload;
    const pending = pendingRolls.get(payload.rollId);
    if (!pending) return; // a roll this session didn't start (or already resolved) — ignore it

    pendingRolls.delete(payload.rollId);

    // Formulas built by rollDice() are always a single group (no "/" —
    // that's TaleSpire's syntax for independent alternate rolls, like
    // advantage), so evaluating group 0 is the whole total. Combining
    // multiple groups isn't needed yet (YAGNI) — nothing in this app
    // builds multi-group formulas.
    const group = payload.resultsGroups[0];
    if (!group || !window.TS) {
      pending.reject(new Error("Roll result had no groups to evaluate."));
      return;
    }
    window.TS.dice
      .evaluateDiceResultsGroup(group)
      .then((total) => pending.resolve(total))
      .catch((error: unknown) => pending.reject(error as Error));
  } else if (event.kind === "rollRemoved") {
    const payload = event.payload as { rollId: string };
    const pending = pendingRolls.get(payload.rollId);
    if (pending) {
      pendingRolls.delete(payload.rollId);
      pending.reject(new Error("Roll was dismissed before being rolled."));
    }
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Tip: THE macro function. Sends a formula (e.g. "1d20+5") to
 * TaleSpire's real physical dice tray and resolves with the total once
 * the player actually rolls it — the roll is genuine, not computed by
 * this app. Outside TaleSpire, simulates the roll locally instead (with
 * a console warning), so "Roll" buttons stay usable while developing in
 * a normal browser.
 */
export async function rollDice(formula: string, label = "Roll"): Promise<number> {
  if (!isRunningInTaleSpire() || !window.TS) {
    console.warn(`[symbiote] Not running in TaleSpire — simulating roll "${formula}" (${label}).`);
    return simulateRoll(formula);
  }

  await waitForSymbioteReady();
  const descriptors: RollDescriptor[] = await window.TS.dice.makeRollDescriptors(formula);
  const rollId = await window.TS.dice.putDiceInTray(descriptors, false);

  return new Promise<number>((resolve, reject) => {
    pendingRolls.set(rollId, { resolve, reject });
  });
}

/** Tip: posts a message to TaleSpire's chat — narration, loot announcements, etc. Logs to the console instead of throwing when running standalone. */
export async function sendChatMessage(message: string, target = "board"): Promise<void> {
  if (!isRunningInTaleSpire() || !window.TS) {
    console.info(`[symbiote] Chat (simulated): ${message}`);
    return;
  }
  await window.TS.chat.send({ message, target });
}

/**
 * Tip: same as sendChatMessage, but attributed to a specific TaleSpire
 * creature (e.g. "Brynna rolled a 17"). Not used yet — this app's
 * characters aren't linked to any TaleSpire creature ID, so there's
 * nothing to pass as creatureFragmentOrId. That link is a future
 * feature; sendChatMessage is what the current roll buttons actually
 * use.
 */
export async function sendChatAsCreature(message: string, creatureId: string, target = "board"): Promise<void> {
  if (!isRunningInTaleSpire() || !window.TS) {
    console.info(`[symbiote] Chat as creature ${creatureId} (simulated): ${message}`);
    return;
  }
  await window.TS.chat.sendAsCreature({ message, creatureFragmentOrId: creatureId, target });
}

/**
 * Tip: standalone-only fallback so roll buttons work in a normal
 * browser during development. Only understands simple "NdM+K" formulas
 * (which is all rollDice's callers in this app ever build) — never used
 * when actually running inside TaleSpire, where the real dice tray is
 * authoritative.
 */
function simulateRoll(formula: string): number {
  const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) throw new Error(`Cannot simulate formula "${formula}" outside TaleSpire.`);
  const [, countStr, sidesStr, modifierStr] = match;
  const count = Number(countStr);
  const sides = Number(sidesStr);
  const modifier = modifierStr ? Number(modifierStr) : 0;

  let total = modifier;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}
