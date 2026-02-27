"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

type ProfileDisplay = Pick<Profile, "avatar_url" | "display_name">;
import { useTheme } from "./ThemeProvider";

function getInitial(name: string | null, email: string | undefined): string {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return "?";
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}
function SystemIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

type NotifItem = {
  follower_id: string;
  created_at: string;
  profile: { id: string; display_name?: string; username?: string; avatar_url?: string | null } | null;
  followed_you_back?: boolean;
};

export default function AppHeader() {
  const supabase = createClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<ProfileDisplay | null>(null);
  const [open, setOpen] = useState(false);

  // ─── Notification bell: who followed you, dismiss, red dot ─────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notificationsViewed, setNotificationsViewed] = useState(false);
  const [followedBackIds, setFollowedBackIds] = useState<Set<string>>(new Set());
  const [followBackLoadingId, setFollowBackLoadingId] = useState<string | null>(null);
  const [selectedNotifKeys, setSelectedNotifKeys] = useState<Set<string>>(new Set());
  const [dismissLoading, setDismissLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  async function fetchNotifications(): Promise<NotifItem[]> {
    const res = await fetch("/api/notifications", { credentials: "include" });
    const json = res.ok ? await res.json() : { data: [] };
    return (json.data ?? []) as NotifItem[];
  }

  const NOTIF_KEY_SEP = "|";
  function notifKey(follower_id: string, created_at: string | undefined) {
    const t =
      typeof created_at === "string"
        ? created_at
        : created_at instanceof Date
          ? created_at.toISOString()
          : created_at != null
            ? new Date(created_at).toISOString()
            : "";
    return `${follower_id}${NOTIF_KEY_SEP}${t}`;
  }
  function parseNotifKey(key: string): { follower_id: string; created_at: string } | null {
    const i = key.indexOf(NOTIF_KEY_SEP);
    if (i === -1) return null;
    const follower_id = key.slice(0, i);
    const created_at = key.slice(i + 1);
    if (!follower_id || !created_at) return null;
    return { follower_id, created_at };
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user ?? null));
  }, []);

  function fetchProfile() {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data as ProfileDisplay | null));
  }

  useEffect(() => {
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const onUpdate = () => fetchProfile();
    window.addEventListener("profile-updated", onUpdate);
    return () => window.removeEventListener("profile-updated", onUpdate);
  }, [user]);

  // On load: fetch notifications once so the red dot can show before opening the panel
  useEffect(() => {
    if (!user) return;
    fetchNotifications().then(setNotifications).catch(() => setNotifications([]));
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    if (open || notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, notifOpen]);

  // When panel opens: refetch notifications + buddies (for Follow back state), then hide red dot
  useEffect(() => {
    if (!notifOpen || !user) return;
    setNotifLoading(true);
    Promise.all([
      fetchNotifications(),
      fetch("/api/buddies", { credentials: "include" }).then((res) => (res.ok ? res.json() : { data: [] })),
    ])
      .then(([data, buddiesRes]) => {
        setNotifications(data);
        const buddyIds = new Set(((buddiesRes as { data?: { id: string }[] }).data ?? []).map((b) => b.id));
        setFollowedBackIds(buddyIds);
      })
      .catch(() => setNotifications([]))
      .finally(() => setNotifLoading(false));
  }, [notifOpen, user]);

  async function signOut() {
    setOpen(false);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleFollowBack(followerId: string) {
    if (followBackLoadingId || followerId === user?.id) return;
    setFollowBackLoadingId(followerId);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: followerId }),
      });
      if (res.ok) setFollowedBackIds((prev) => new Set(prev).add(followerId));
    } finally {
      setFollowBackLoadingId(null);
    }
  }

  function toggleNotifSelected(key: string) {
    setSelectedNotifKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllNotifications() {
    setSelectedNotifKeys(new Set(notifications.map((n) => notifKey(n.follower_id, n.created_at))));
  }

  async function handleRemoveSelected() {
    if (selectedNotifKeys.size === 0 || dismissLoading) return;
    const keysToRemove = new Set(selectedNotifKeys);
    const toDismiss = [...keysToRemove].map(parseNotifKey).filter((p): p is { follower_id: string; created_at: string } =>
      p !== null && p.follower_id && p.created_at && !Number.isNaN(new Date(p.created_at).getTime())
    );
    if (toDismiss.length === 0) return;
    setDismissLoading(true);
    setNotifications((prev) =>
      prev.filter((n) => !keysToRemove.has(notifKey(n.follower_id, n.created_at)))
    );
    setSelectedNotifKeys(new Set());
    try {
      const results = await Promise.all(
        toDismiss.map(({ follower_id, created_at }) =>
          fetch("/api/notifications", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ follower_id, created_at }),
          })
        )
      );
      const allOk = results.every((r) => r.ok);
      if (!allOk) {
        const data = await fetchNotifications();
        setNotifications(data);
      }
    } finally {
      setDismissLoading(false);
    }
  }

  async function handleClearAll() {
    if (notifications.length === 0 || dismissLoading) return;
    setDismissLoading(true);
    setNotifications([]);
    setSelectedNotifKeys(new Set());
    try {
      await fetch("/api/notifications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
    } finally {
      setDismissLoading(false);
    }
  }

  if (!user) return null;

  const avatarUrl = profile?.avatar_url;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const imageSrc =
    avatarUrl && supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`
      : null;
  const initial = getInitial(profile?.display_name ?? null, user.email);

  return (
    <header className="w-full bg-surface-card dark:bg-stone-900 border-b border-surface-border dark:border-stone-700 sticky top-0 z-20 shadow-card">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center gap-4">
        <Link
          href="/dashboard"
          className="text-lg font-bold text-stone-900 dark:text-white tracking-tight hover:text-stone-700 dark:hover:text-stone-200 transition shrink-0"
        >
          SharePals
        </Link>

        <div className="flex items-center gap-3">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen((o) => {
                  const next = !o;
                  if (next) setNotificationsViewed(true);
                  return next;
                });
              }}
              className="p-2 rounded-full text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-white/20 focus:ring-offset-2"
              aria-label="Notifications"
              aria-expanded={notifOpen}
            >
              <BellIcon className="w-5 h-5" />
              {notifications.length > 0 && !notificationsViewed && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" aria-hidden />
              )}
            </button>
            {notifOpen && (
              <div
                className="absolute right-0 mt-2 w-80 max-h-[min(24rem,70vh)] overflow-auto rounded-lg bg-stone-900 dark:bg-stone-900 border border-stone-700 shadow-xl z-30 py-2"
                role="dialog"
                aria-label="Who followed you"
              >
                <div className="px-4 py-2 border-b border-stone-700">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                </div>
                {notifLoading ? (
                  <div className="px-4 py-6 text-center text-stone-400 text-sm">Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-stone-400 text-sm">No notifications yet.</div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-700/80">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-400 hover:text-stone-300">
                        <input
                          type="checkbox"
                          checked={selectedNotifKeys.size === notifications.length && notifications.length > 0}
                          onChange={(e) => (e.target.checked ? selectAllNotifications() : setSelectedNotifKeys(new Set()))}
                          className="rounded border-stone-500 bg-stone-800 text-accent focus:ring-accent"
                        />
                        Select all
                      </label>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        disabled={dismissLoading}
                        className="ml-auto text-xs font-medium text-stone-400 hover:text-white transition disabled:opacity-50"
                      >
                        {dismissLoading ? "…" : "Clear all"}
                      </button>
                      {selectedNotifKeys.size > 0 && (
                        <button
                          type="button"
                          onClick={handleRemoveSelected}
                          disabled={dismissLoading}
                          className="text-xs font-medium text-rose-400 hover:text-rose-300 transition disabled:opacity-50"
                        >
                          Remove selected ({selectedNotifKeys.size})
                        </button>
                      )}
                    </div>
                    <ul className="py-1">
                    {notifications.map((n) => {
                      const key = notifKey(n.follower_id, n.created_at);
                      const name = n.profile?.display_name || n.profile?.username || "Someone";
                      const when = (() => {
                        const d = new Date(n.created_at);
                        const sec = (Date.now() - d.getTime()) / 1000;
                        if (sec < 60) return "Just now";
                        if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
                        if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
                        if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
                        return d.toLocaleDateString();
                      })();
                      return (
                        <li key={key} className="px-4 py-2.5 hover:bg-stone-800 transition">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedNotifKeys.has(key)}
                              onChange={() => toggleNotifSelected(key)}
                              className="shrink-0 rounded border-stone-500 bg-stone-800 text-accent focus:ring-accent"
                              aria-label={`Remove notification from ${name}`}
                            />
                            {n.profile?.avatar_url && supabaseUrl ? (
                              <img
                                src={`${supabaseUrl}/storage/v1/object/public/avatars/${n.profile.avatar_url}`}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover border border-stone-600 shrink-0"
                              />
                            ) : (
                              <span className="w-9 h-9 rounded-full bg-stone-700 flex items-center justify-center text-stone-300 text-sm font-semibold shrink-0">
                                {name.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">
                                <span className="font-medium">{name}</span>
                                <span className="text-stone-400">
                                  {n.followed_you_back ? " followed you back" : " followed you"}
                                </span>
                              </p>
                              <p className="text-xs text-stone-500">{when}</p>
                            </div>
                            {followedBackIds.has(n.follower_id) ? (
                              <span className="shrink-0 text-xs text-stone-500 px-2.5 py-1 rounded-full border border-stone-600">
                                Following
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleFollowBack(n.follower_id)}
                                disabled={followBackLoadingId === n.follower_id}
                                className="shrink-0 text-xs font-medium text-accent hover:text-accent-hover px-2.5 py-1 rounded-full border border-accent/50 hover:border-accent transition disabled:opacity-50"
                              >
                                {followBackLoadingId === n.follower_id ? "…" : "Follow back"}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-white/20 focus:ring-offset-2 p-0.5 hover:opacity-90 transition"
              aria-expanded={open}
              aria-haspopup="true"
            >
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border-2 border-surface-border dark:border-stone-600"
                />
              ) : (
                <span className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-600 border-2 border-surface-border dark:border-stone-600 flex items-center justify-center text-stone-600 dark:text-stone-200 text-sm font-semibold shrink-0">
                  {initial}
                </span>
              )}
              <svg
                className={`w-4 h-4 text-stone-500 dark:text-stone-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open && (
              <div
                className="absolute right-0 mt-2 w-60 rounded-lg bg-stone-900 dark:bg-stone-900 border border-stone-700 py-2 shadow-xl z-30"
                role="menu"
              >
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-white hover:bg-stone-800 transition"
                  role="menuitem"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-white hover:bg-stone-800 transition"
                  role="menuitem"
                >
                  Account Settings
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-white hover:bg-stone-800 transition"
                  role="menuitem"
                >
                  Create Team
                  <span className="w-6 h-6 rounded-full bg-stone-700 flex items-center justify-center text-stone-300">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                </Link>
                <div className="flex items-center justify-between px-4 py-2.5 text-sm text-white">
                  <span>Theme</span>
                  <div className="flex items-center gap-0.5 rounded-lg bg-stone-800 p-0.5">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={`p-1.5 rounded-md transition ${theme === "light" ? "bg-stone-700 text-white" : "text-stone-400 hover:text-white"}`}
                      title="Light"
                      aria-pressed={theme === "light"}
                    >
                      <SunIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("system")}
                      className={`p-1.5 rounded-md transition ${theme === "system" ? "bg-stone-700 text-white" : "text-stone-400 hover:text-white"}`}
                      title="System"
                      aria-pressed={theme === "system"}
                    >
                      <SystemIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`p-1.5 rounded-md transition ${theme === "dark" ? "bg-stone-700 text-white" : "text-stone-400 hover:text-white"}`}
                      title="Dark"
                      aria-pressed={theme === "dark"}
                    >
                      <MoonIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="my-1 border-t border-stone-700" />
                <Link
                  href="/dashboard?mine=1"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-white hover:bg-stone-800 transition"
                  role="menuitem"
                >
                  Home Page
                  <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </Link>
                <Link
                  href="/buddies"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-white hover:bg-stone-800 transition"
                  role="menuitem"
                >
                  Buddy list
                  <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-white hover:bg-stone-800 transition text-left"
                  role="menuitem"
                >
                  Log Out
                  <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
