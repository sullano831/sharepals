"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50/80 to-surface dark:from-stone-900 dark:to-stone-950 p-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">SharePals</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Create your account</p>
        </div>

        <form
          onSubmit={handleRegister}
          className="bg-surface-card dark:bg-stone-900 rounded-2xl border border-surface-border dark:border-stone-700 p-6 shadow-soft space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-surface-border dark:border-stone-600 rounded-xl px-4 py-2.5 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-surface-border dark:border-stone-600 rounded-xl px-4 py-2.5 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500"
              placeholder="Min 6 characters"
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
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover font-medium transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
