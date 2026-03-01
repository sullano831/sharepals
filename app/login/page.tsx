"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/app/components/AppHeader";
import { Mail, Lock, X } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const [signUpLoading, setSignUpLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSignUpError("");
    setSignUpLoading(true);
    const { error } = await supabase.auth.signUp({ email: signUpEmail, password: signUpPassword });
    if (error) {
      setSignUpError(error.message);
      setSignUpLoading(false);
    } else {
      setSignUpOpen(false);
      setSignUpEmail("");
      setSignUpPassword("");
      setSignUpLoading(false);
      window.location.href = "/dashboard";
    }
  }

  useEffect(() => {
    if (!signUpOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSignUpOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [signUpOpen]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("xxx")) {
      setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see .env.example).");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        const search =
          typeof window !== "undefined" ? window.location.search : "";
        const params = new URLSearchParams(search);
        const redirectTo = params.get("redirect") ?? "/dashboard";
        const path = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
        window.location.href = path;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes("fetch") ||
        message.includes("NetworkError") ||
        (err instanceof TypeError && message.toLowerCase().includes("fetch"))
      ) {
        setError(
          "Cannot reach Supabase. Check your internet connection, that .env.local has the correct NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, and that your Supabase project is not paused (see dashboard.supabase.com)."
        );
      } else {
        setError(message);
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-stone-950">
      <AppHeader />

      {/* Sign up modal */}
      {signUpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSignUpOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-title"
        >
          <div
            className="relative w-full max-w-[400px] rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSignUpOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 id="signup-title" className="text-xl font-semibold text-stone-900 dark:text-stone-100 pr-8">
              Sign up
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Create your account to start sharing.
            </p>
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500 pointer-events-none" />
                  <input
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50/50 dark:bg-stone-800/50 pl-11 pr-4 py-3 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500 pointer-events-none" />
                  <input
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50/50 dark:bg-stone-800/50 pl-11 pr-4 py-3 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
                    placeholder="Min 6 characters"
                  />
                </div>
              </div>
              {signUpError && (
                <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-800/50">
                  {signUpError}
                </p>
              )}
              <button
                type="submit"
                disabled={signUpLoading}
                className="w-full rounded-2xl bg-burgundy hover:bg-burgundy-light text-white font-medium py-3.5 text-sm transition-colors disabled:opacity-50"
              >
                {signUpLoading ? "Creating account…" : "Sign up"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Left panel — burgundy tech background (lines, dots, gradient) */}
        <div
          className="hidden md:flex md:w-[55%] rounded-r-[4rem] flex-col items-center justify-center px-12 lg:px-20 relative overflow-hidden bg-burgundy-dark"
          style={{
            background: "radial-gradient(ellipse 90% 80% at 50% 50%, #8B3A42 0%, #5C262D 50%, #4a1f25 100%)",
          }}
        >
          {/* Circuit-style overlay: lines, dots, shapes in gold/tan */}
          <div className="absolute inset-0 opacity-70" aria-hidden>
            <svg className="w-full h-full" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="lineGold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(201, 162, 39, 0.35)" />
                  <stop offset="100%" stopColor="rgba(180, 140, 80, 0.5)" />
                </linearGradient>
                <linearGradient id="dotGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(201, 162, 39, 0.6)" />
                  <stop offset="100%" stopColor="rgba(180, 130, 60, 0.3)" />
                </linearGradient>
              </defs>
              {/* Arc segments / circuit lines */}
              <path d="M 0 120 Q 200 80 400 100 T 800 90" stroke="url(#lineGold)" strokeWidth="0.8" fill="none" opacity="0.9" />
              <path d="M 0 200 Q 250 160 500 180 T 800 190" stroke="url(#lineGold)" strokeWidth="0.6" fill="none" opacity="0.7" />
              <path d="M 0 480 Q 300 520 600 500 T 800 480" stroke="url(#lineGold)" strokeWidth="0.7" fill="none" opacity="0.8" />
              <path d="M 0 380 Q 200 400 400 380 T 800 360" stroke="url(#lineGold)" strokeWidth="0.5" fill="none" opacity="0.6" />
              <path d="M 80 0 V 600" stroke="url(#lineGold)" strokeWidth="0.5" opacity="0.5" />
              <path d="M 720 0 V 600" stroke="url(#lineGold)" strokeWidth="0.5" opacity="0.5" />
              <path d="M 150 0 V 400" stroke="url(#lineGold)" strokeWidth="0.4" opacity="0.4" />
              <path d="M 650 100 V 600" stroke="url(#lineGold)" strokeWidth="0.4" opacity="0.4" />
              {/* Dots / nodes */}
              {[40, 120, 200, 280, 360, 440, 520].map((y, i) => (
                <circle key={`d1-${i}`} cx={100 + i * 110} cy={y} r="2" fill="url(#dotGlow)" />
              ))}
              {[80, 160, 320, 480].map((y, i) => (
                <circle key={`d2-${i}`} cx={700} cy={y} r="1.5" fill="rgba(201,162,39,0.5)" />
              ))}
              {/* Small circles with crosshairs feel */}
              <circle cx="120" cy="300" r="8" stroke="url(#lineGold)" strokeWidth="0.8" fill="none" opacity="0.6" />
              <circle cx="680" cy="250" r="6" stroke="url(#lineGold)" strokeWidth="0.6" fill="none" opacity="0.5" />
              <circle cx="200" cy="480" r="5" stroke="url(#lineGold)" strokeWidth="0.5" fill="none" opacity="0.5" />
              {/* Tiny squares/triangles */}
              <rect x="50" y="80" width="4" height="4" fill="rgba(201,162,39,0.4)" transform="rotate(15 52 82)" />
              <rect x="750" y="400" width="3" height="3" fill="rgba(201,162,39,0.35)" transform="rotate(-20 751 401)" />
              <polygon points="700,50 704,56 696,56" fill="rgba(201,162,39,0.4)" />
              <polygon points="100,520 104,526 96,526" fill="rgba(201,162,39,0.35)" />
            </svg>
          </div>
          {/* Soft vignette so content stays readable */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(0,0,0,0.25) 100%)",
            }}
            aria-hidden
          />
          {/* Content */}
          <div className="relative z-10 max-w-sm text-center">
            <h2 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight">
              New here?
            </h2>
            <p className="mt-3 text-white/90 text-lg">
              Then sign up and start sharing with your pals.
            </p>
            <button
              type="button"
              onClick={() => setSignUpOpen(true)}
              className="mt-8 inline-flex items-center justify-center w-full max-w-[200px] py-3 px-6 rounded-2xl border-2 border-white text-white font-medium hover:bg-white/10 transition-colors"
            >
              Sign up
            </button>
          </div>
        </div>

        {/* Right panel — sign in form */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-stone-50 dark:bg-stone-900/50 min-h-[60vh] md:min-h-0">
          <div className="w-full max-w-[380px]">
            {/* Mobile-only sign up CTA */}
            <div className="md:hidden mb-6 p-4 rounded-2xl bg-burgundy/10 dark:bg-burgundy/20 border border-burgundy/20">
              <p className="text-sm text-stone-700 dark:text-stone-300">
                New here?{" "}
                <button
                  type="button"
                  onClick={() => setSignUpOpen(true)}
                  className="font-medium text-burgundy hover:text-burgundy-light"
                >
                  Sign up
                </button>
                {" "}to start sharing.
              </p>
            </div>

            <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
              Sign in
            </h1>

            <form
              onSubmit={handleLogin}
              className="mt-8 space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 pl-11 pr-4 py-3 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-stone-600 dark:text-stone-400">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-burgundy hover:text-burgundy-light font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 pl-11 pr-4 py-3 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-800/50">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-burgundy hover:bg-burgundy-light text-white font-medium py-3.5 text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
