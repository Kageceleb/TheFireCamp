import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./client";

/** Tip: call this from a "Sign in with Google" button — redirects to Google's consent screen and back to this app. */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
  if (error) throw error;
}

/** Tip: call this from a "Sign out" button. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Tip: use this once on app startup to check whether there's already a signed-in session (e.g. the user just refreshed the page). */
export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Tip: subscribes to sign-in/sign-out events so the UI can react live —
 * most importantly, right after the Google redirect completes. Returns
 * an unsubscribe function; call it from a useEffect cleanup so the
 * listener doesn't pile up across re-renders.
 */
export function subscribeToAuthChanges(onChange: (user: User | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}
