// Ambient types for TaleSpire's injected Symbiote API (window.TS) and the
// global event handler functions our manifest.json declares.
//
// These call signatures are typed as Promise-returning based on the
// official API docs (symbiote-docs.talespire.com/api_doc_v0_1.md.html) —
// the docs list each call's synchronous "Returns" type, but cross-process
// webview APIs like this are consistently Promise-based in practice.
// This hasn't been verified against a real TaleSpire instance yet; if a
// call turns out to resolve differently, this is the one file to fix.

export interface RollDescriptor {
  name: string;
  roll: string;
}

// Deliberately loose — a rollResultsGroup's `result` field is a union of
// three shapes (rollResultsOperation | rollResult | rollValue) that this
// app never needs to inspect itself; it's only ever handed back to
// TS.dice.evaluateDiceResultsGroup, which does the interpreting.
export interface RollResultsGroup {
  name: string;
  result: unknown;
}

export interface RollResultsPayload {
  rollId: string;
  clientId: string;
  resultsGroups: RollResultsGroup[];
  gmOnly: boolean;
  quiet: boolean;
}

export interface SymbioteEvent<TPayload = unknown> {
  kind: string;
  payload: TPayload;
}

declare global {
  interface Window {
    TS?: {
      dice: {
        isValidRollString(rollStr: string): Promise<boolean>;
        makeRollDescriptors(rollString: string): Promise<RollDescriptor[]>;
        putDiceInTray(rollDescriptors: RollDescriptor[], quietResults?: boolean): Promise<string>;
        evaluateDiceResultsGroup(resultsGroup: RollResultsGroup): Promise<number>;
      };
      chat: {
        send(args: { message: string; target: string }): Promise<void>;
        sendAsCreature(args: { message: string; creatureFragmentOrId: string; target: string }): Promise<void>;
      };
      players: {
        whoAmI(): Promise<{ id: string; name: string }>;
      };
    };
    // These exact names are declared in symbiote/manifest.json's
    // api.subscriptions — TaleSpire calls them directly, so they must be
    // real globals (assigned in client.ts), not scoped module functions.
    handleRollResult?: (event: SymbioteEvent) => void;
    handleSymbioteStateChange?: (event: SymbioteEvent) => void;
  }
}

export {};
