import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getCurrentSession, subscribeToAuthChanges } from "./lib/supabase/auth";
import SignIn from "./components/SignIn";
import SignedInShell from "./components/SignedInShell";

/**
 * Tip: this component's ONLY job is picking a screen based on auth
 * state — it doesn't know anything about campaigns, bags, or
 * characters. Keeping it this thin is what makes it easy to add a third
 * state later (e.g. "inside a specific campaign") without this file
 * growing into a god-component that knows about everything.
 */
export default function App() {
  // undefined = still checking for a session; null = signed out; User = signed in
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    getCurrentSession().then((session) => setUser(session?.user ?? null));
    const unsubscribe = subscribeToAuthChanges(setUser);
    return unsubscribe;
  }, []);

  if (user === undefined) {
    return <CenteredMessage text="Loading…" />;
  }

  if (user === null) {
    return <SignIn />;
  }

  return <SignedInShell user={user} />;
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121110] text-[#a89a7d]">
      {text}
    </div>
  );
}
