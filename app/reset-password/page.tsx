"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setChecking(false);
      if (session?.user) setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50/80 to-surface dark:from-stone-900 dark:to-stone-950 p-4">
        <div className="w-full max-w-[380px] text-center text-stone-500 dark:text-stone-400 text-sm">
          Loading…
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50/80 to-surface dark:from-stone-900 dark:to-stone-950 p-4">
        <div className="w-full max-w-[380px]">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">
              SharePals
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
              Invalid or expired link
            </p>
          </div>
          <div className="bg-surface-card dark:bg-stone-900 rounded-2xl border border-surface-border dark:border-stone-700 p-6 shadow-soft space-y-4">
            <p className="text-sm text-stone-600 dark:text-stone-300 text-center">
              This reset link is invalid or has expired. Request a new one below.
            </p>
            <Link
              href="/forgot-password"
              className="block w-full text-center bg-stone-900 hover:bg-stone-800 text-white font-medium py-2.5 rounded-xl text-sm transition shadow-card"
            >
              Request new link
            </Link>
            <Link
              href="/login"
              className="block w-full text-center text-sm text-accent hover:text-accent-hover font-medium transition mt-3"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50/80 to-surface dark:from-stone-900 dark:to-stone-950 p-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">
            SharePals
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            Set a new password
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-card dark:bg-stone-900 rounded-2xl border border-surface-border dark:border-stone-700 p-6 shadow-soft space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full border border-surface-border dark:border-stone-600 rounded-xl px-4 py-2.5 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500"
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full border border-surface-border dark:border-stone-600 rounded-xl px-4 py-2.5 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500"
              placeholder="Repeat password"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 rounded-lg border border-rose-100 dark:border-rose-900">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition shadow-card"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-5">
          <Link
            href="/login"
            className="text-accent hover:text-accent-hover font-medium transition"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
