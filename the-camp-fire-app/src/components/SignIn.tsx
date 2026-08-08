import { signInWithGoogle } from "../lib/supabase/auth";

/** Tip: the landing screen for a signed-out visitor. */
export default function SignIn() {
  function handleSignIn() {
    signInWithGoogle().catch((error: Error) => {
      console.error("Sign-in failed", error);
      alert("Sign-in failed: " + error.message);
    });
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
      style={{ background: "radial-gradient(ellipse at top, #1c1a17 0%, #121110 65%)" }}
    >
      <style>{`* { font-family: 'Inter', sans-serif; }`}</style>
      <h1 className="text-3xl tracking-wide mb-2" style={{ fontFamily: "Cinzel, serif", color: "#F0C58A" }}>
        The Camp Fire
      </h1>
      <p className="text-sm mb-8" style={{ color: "#a89a7d" }}>
        Sign in to gather around the fire.
      </p>
      <button
        onClick={handleSignIn}
        className="flex items-center gap-3 px-5 py-2.5 rounded-lg font-medium bg-white text-[#121110]"
      >
        <GoogleIcon />
        Sign in with Google
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.5 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5 44.5 35.3 44.5 24c0-1.2-.1-2.4-.3-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.5 3.5 24 3.5c-7.6 0-14.2 4.3-17.7 10.6z" />
      <path fill="#4CAF50" d="M24 44.5c5.4 0 10.3-1.8 14.1-5l-6.5-5.5c-2 1.4-4.6 2.3-7.6 2.3-5.4 0-10-3.4-11.6-8.2l-6.6 5.1C9.7 40.1 16.3 44.5 24 44.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.5-2.6 4.7-4.8 6.2l6.5 5.5C40.5 36.9 44.5 31 44.5 24c0-1.2-.1-2.4-.3-3.5z" />
    </svg>
  );
}
