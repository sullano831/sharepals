"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/app/components/AppHeader";

type Buddy = { id: string; username?: string; display_name?: string; avatar_url?: string | null };

function getInitial(name: string, username: string): string {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase();
  if (username?.trim()) return username.trim().charAt(0).toUpperCase();
  return "?";
}

export default function BuddiesPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [unfollowId, setUnfollowId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/buddies", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then(({ data }: { data?: Buddy[] }) => setBuddies(data ?? []))
      .catch(() => setBuddies([]));
  }, [user]);

  async function handleUnfollow(buddyId: string) {
    if (unfollowId) return;
    setUnfollowId(buddyId);
    try {
      const res = await fetch(`/api/follow?userId=${encodeURIComponent(buddyId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Unfollow failed");
      setBuddies((prev) => prev.filter((b) => b.id !== buddyId));
    } catch {
      // keep list unchanged
    } finally {
      setUnfollowId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-stone-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-stone-200 dark:border-stone-700 border-t-stone-600 dark:border-t-stone-400 animate-spin" />
          <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface dark:bg-stone-950">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            Not signed in.{" "}
            <Link href="/login" className="text-accent hover:text-accent-hover font-medium transition">
              Sign in
            </Link>
          </p>
        </main>
      </div>
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div className="min-h-screen bg-surface dark:bg-stone-950">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-border dark:via-stone-700 to-transparent" />
          <h1 className="text-lg font-semibold text-stone-800 dark:text-stone-100 shrink-0">
            Buddy list
          </h1>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-border dark:via-stone-700 to-transparent" />
        </div>

        {buddies.length === 0 ? (
          <div className="bg-surface-card dark:bg-stone-900/80 rounded-2xl border border-surface-border dark:border-stone-700/80 border-dashed p-12 text-center">
            <p className="text-stone-600 dark:text-stone-300 font-medium">No buddies yet</p>
            <p className="text-stone-500 dark:text-stone-500 text-sm mt-1">
              Follow people from their posts on the dashboard to add them here.
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-4 text-sm font-medium text-accent hover:text-accent-hover transition"
            >
              Go to dashboard →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {buddies.map((buddy) => (
              <li
                key={buddy.id}
                className="bg-surface-card dark:bg-stone-900/80 rounded-2xl border border-surface-border dark:border-stone-700/80 p-4 flex items-center gap-4 shadow-card"
              >
                {buddy.avatar_url && supabaseUrl ? (
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/avatars/${buddy.avatar_url}`}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border-2 border-surface-border dark:border-stone-600 shrink-0"
                  />
                ) : (
                  <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-600 dark:to-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-200 text-lg font-bold">
                    {getInitial(buddy.display_name ?? "", buddy.username ?? "")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-800 dark:text-stone-100 truncate">
                    {buddy.display_name || buddy.username || "Someone"}
                  </p>
                  {buddy.display_name && buddy.username && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate">@{buddy.username}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleUnfollow(buddy.id)}
                  disabled={unfollowId === buddy.id}
                  className="shrink-0 text-xs font-medium text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition disabled:opacity-50"
                >
                  {unfollowId === buddy.id ? "Removing…" : "Unfollow"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
