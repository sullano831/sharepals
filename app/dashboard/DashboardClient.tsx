"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Post, PostFile } from "@/lib/types/database";
import type { Profile } from "@/lib/types/database";
import AppHeader from "@/app/components/AppHeader";
import { Video, Image, FileText, Pencil, Trash2, FileInput, FileCode } from "lucide-react";

/** Dashboard flow: post → shows in feed; for your posts you can Edit (modify) or Delete (remove) in the dashboard. */
export type DashboardClientProps = {
  initialPosts?: Post[];
  initialUser?: { id: string; email?: string } | null;
  /** When true, feed was loaded on the server (e.g. on refresh) so we show it immediately. */
  hasServerFeed?: boolean;
};

type UploadMode = "video" | "photo" | "file";

const FILE_ACCEPT: Record<UploadMode, string> = {
  video: "video/*",
  photo: "image/*",
  file: ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,text/plain,text/csv",
};

const TOOLS_FOR_PALS = [
  {
    label: "Form Conversion Tool",
    href: "https://fastfastbootstrap.infinityfreeapp.com/?i=1",
    icon: FileInput,
  },
  {
    label: "File Converter Tool",
    href: "https://file-converter-delta-nine.vercel.app/",
    icon: FileCode,
  },
] as const;

const SIDEBAR_STORAGE_KEY = "sharepals-tools-sidebar-width";
const SIDEBAR_DEFAULT_WIDTH = 280;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 480;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB, must match API

// All supported types for "Add file(s)" in edit so any file can be added
const ACCEPT_ALL =
  "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,text/plain,text/csv";

async function parseJsonOrThrow(res: Response, fallbackError: string): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) throw new Error(fallbackError);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(fallbackError);
  }
}

export default function DashboardClient({
  initialPosts = [],
  initialUser = null,
  hasServerFeed = false,
}: DashboardClientProps) {
  const searchParams = useSearchParams();
  const mineOnly = searchParams.get("mine") === "1";
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<{ email?: string; id: string } | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loading, setLoading] = useState(!initialUser);
  const [feedLoading, setFeedLoading] = useState(!hasServerFeed);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<"members" | "private">("members");
  const [error, setError] = useState("");
  const [formExpanded, setFormExpanded] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("photo");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editVisibility, setEditVisibility] = useState<"members" | "private">("members");
  const [editFilesToDiscard, setEditFilesToDiscard] = useState<string[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editError, setEditError] = useState("");
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [buddyIds, setBuddyIds] = useState<Set<string>>(new Set());
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);
  const [feedError, setFeedError] = useState(false);
  const [feedErrorMessage, setFeedErrorMessage] = useState<string | null>(null);
  const skipFirstFeedFetchRef = useRef(hasServerFeed);

  const [toolsSidebarWidth, setToolsSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
    try {
      const w = parseInt(localStorage.getItem(SIDEBAR_STORAGE_KEY) ?? "", 10);
      if (Number.isFinite(w) && w >= SIDEBAR_MIN_WIDTH && w <= SIDEBAR_MAX_WIDTH) return w;
    } catch {}
    return SIDEBAR_DEFAULT_WIDTH;
  });
  const sidebarResizeRef = useRef<{ startX: number; startW: number } | null>(null);

  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    setIsLg(m.matches);
    const f = () => setIsLg(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  const startSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    sidebarResizeRef.current = { startX: e.clientX, startW: toolsSidebarWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMouseMove = (ev: MouseEvent) => {
      const r = sidebarResizeRef.current;
      if (!r) return;
      const delta = ev.clientX - r.startX;
      const next = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, r.startW + delta));
      setToolsSidebarWidth(next);
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {}
    };
    const onMouseUp = () => {
      sidebarResizeRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [toolsSidebarWidth]);

  const feedCacheKey = user ? `sharepals-feed-${user.id}-${mineOnly ? "mine" : "all"}` : null;

  // Persist posts to sessionStorage so they stay visible on reload if the API fails
  useEffect(() => {
    if (!feedCacheKey || posts.length === 0) return;
    try {
      sessionStorage.setItem(feedCacheKey, JSON.stringify(posts));
    } catch {
      // ignore quota or private mode
    }
  }, [feedCacheKey, posts]);

  useEffect(() => {
    if (initialUser) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      setLoading(false);
    });
  }, [initialUser]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data ?? null));
  }, [user]);

  const refetchFeed = useCallback((backgroundRefresh = false) => {
    if (!user) return;
    setFeedError(false);
    setFeedErrorMessage(null);
    if (!backgroundRefresh) setFeedLoading(true);
    const url = mineOnly ? "/api/posts?mine=1&limit=5000" : "/api/posts?limit=5000";
    fetch(url, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = typeof body?.error === "string" ? body.error : "Failed to load feed";
          throw new Error(msg);
        }
        return body as { data?: Post[] };
      })
      .then(({ data }) => {
        setPosts(Array.isArray(data) ? data : data ?? []);
        setFeedError(false);
        setFeedErrorMessage(null);
      })
      .catch((err) => {
        setFeedError(true);
        setFeedErrorMessage(err instanceof Error ? err.message : "Failed to load feed");
      })
      .finally(() => setFeedLoading(false));
  }, [user, mineOnly]);

  useEffect(() => {
    if (!user) return;
    if (skipFirstFeedFetchRef.current) {
      skipFirstFeedFetchRef.current = false;
      setFeedLoading(false);
      return;
    }
    // On reload, show last known posts from cache immediately so feed isn't empty while API may fail
    try {
      const key = `sharepals-feed-${user.id}-${mineOnly ? "mine" : "all"}`;
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Post[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPosts(parsed);
          refetchFeed(true); // background refresh so cached posts stay visible
          return;
        }
      }
    } catch {
      // ignore invalid JSON
    }
    refetchFeed();
  }, [user, mineOnly, refetchFeed]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/buddies", { credentials: "include" })
      .then((res) => res.ok ? res.json() : { data: [] })
      .then(({ data }: { data?: { id: string }[] }) => setBuddyIds(new Set((data ?? []).map((b) => b.id))))
      .catch(() => setBuddyIds(new Set()));
  }, [user]);

  useEffect(() => {
    if (fileInputRef.current) fileInputRef.current.accept = FILE_ACCEPT[uploadMode];
  }, [uploadMode]);

  async function toggleFollow(authorId: string) {
    if (followLoadingId || authorId === user?.id) return;
    setFollowLoadingId(authorId);
    const isFollowing = buddyIds.has(authorId);
    try {
      if (isFollowing) {
        const res = await fetch(`/api/follow?userId=${encodeURIComponent(authorId)}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Unfollow failed");
        setBuddyIds((prev) => {
          const next = new Set(prev);
          next.delete(authorId);
          return next;
        });
      } else {
        const res = await fetch("/api/follow", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: authorId }),
        });
        if (!res.ok) throw new Error("Follow failed");
        setBuddyIds((prev) => new Set(prev).add(authorId));
      }
    } catch {
      // keep state unchanged
    } finally {
      setFollowLoadingId(null);
    }
  }

  function openComposer(mode: UploadMode) {
    setUploadMode(mode);
    setFormExpanded(true);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!files.length && !caption.trim()) {
      setError("Add a file or a caption.");
      return;
    }
    const oversized = files.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setError("Exceeds the file limit.");
      return;
    }
    setUploading(true);
    try {
      const uploadedFiles: { path: string; name: string; type: string; size: number }[] = [];
      for (const file of files) {
        // Get signed upload URL (avoids Next.js body size limit; client uploads directly to Supabase)
        const urlRes = await fetch("/api/upload-url", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        });
        if (!urlRes.ok) {
          let msg = "Upload failed";
          try {
            const text = await urlRes.text();
            if (text.trim()) {
              const err = JSON.parse(text) as { error?: string };
              msg = err?.error ?? msg;
            }
          } catch {
            if (urlRes.status === 413) msg = "Exceeds the file limit.";
          }
          const isLimit = urlRes.status === 413 || /exceed|limit/i.test(msg);
          throw new Error(isLimit ? "Exceeds the file limit." : msg);
        }
        const { path, token } = (await parseJsonOrThrow(urlRes, "Invalid upload URL response")) as {
          path: string;
          token: string;
        };
        const { error: uploadErr } = await supabase.storage
          .from("post-files")
          .uploadToSignedUrl(path, token, file, { contentType: file.type });
        if (uploadErr) throw new Error(uploadErr.message);
        uploadedFiles.push({ path, name: file.name, type: file.type, size: file.size });
      }

      const postRes = await fetch("/api/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: caption.trim() || undefined,
          visibility,
          ...(uploadedFiles.length ? { files: uploadedFiles } : {}),
        }),
      });
      if (!postRes.ok) {
        const err = (await parseJsonOrThrow(postRes, "Failed to share")) as { error?: string };
        throw new Error(err?.error || "Failed to share");
      }
      const newPost = (await parseJsonOrThrow(postRes, "Invalid response from server")) as Post;
      setPosts((prev) => [newPost, ...prev]);
      setCaption("");
      setFiles([]);
      setVisibility("members");
      setFormExpanded(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      const isLimit = /exceed|limit/i.test(msg);
      setError(isLimit ? "Exceeds the file limit." : msg);
    } finally {
      setUploading(false);
    }
  }

  function startEdit(post: Post) {
    setEditingId(post.id);
    setEditCaption(post.content ?? "");
    setEditVisibility(
      post.visibility === "private" ? "private" : "members"
    );
    setEditFilesToDiscard([]);
    setEditNewFiles([]);
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditCaption("");
    setEditVisibility("members");
    setEditFilesToDiscard([]);
    setEditNewFiles([]);
    setEditError("");
  }

  async function saveEdit(postId: string) {
    setEditError("");
    setError("");
    try {
      const newFilesPayload: { path: string; name: string; type: string; size: number }[] = [];
      for (const file of editNewFiles) {
        const urlRes = await fetch("/api/upload-url", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
            postId,
          }),
        });
        if (!urlRes.ok) {
          const err = (await urlRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(err?.error || "Upload failed");
        }
        const { path, token } = (await urlRes.json()) as { path: string; token: string };
        const { error: uploadErr } = await supabase.storage
          .from("post-files")
          .uploadToSignedUrl(path, token, file, { contentType: file.type });
        if (uploadErr) throw new Error(uploadErr.message);
        newFilesPayload.push({ path, name: file.name, type: file.type, size: file.size });
      }

      const body: Record<string, unknown> = {
        content: editCaption.trim() || null,
        visibility: editVisibility,
        ...(editFilesToDiscard.length ? { discard_file_ids: editFilesToDiscard } : {}),
        ...(newFilesPayload.length ? { new_files: newFilesPayload } : {}),
      };

      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }
      const updated = await res.json();
      const updatedFiles = (updated as { files?: PostFile[] }).files;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                content: updated.content,
                visibility: updated.visibility,
                updated_at: updated.updated_at,
                file_url: updated.file_url ?? p.file_url,
                file_name: updated.file_name ?? p.file_name,
                file_type: updated.file_type ?? p.file_type,
                file_size: updated.file_size ?? p.file_size,
                files: Array.isArray(updatedFiles) ? updatedFiles : (p.files ?? []),
              }
            : p
        )
      );
      // Refetch this post from server so we always show all files (single source of truth)
      try {
        const getRes = await fetch(`/api/posts/${postId}`, { credentials: "include" });
        if (getRes.ok) {
          const fresh = await getRes.json();
          const freshFiles = (fresh as { files?: PostFile[] }).files;
          setPosts((prev) =>
            prev.map((q) =>
              q.id === postId
                ? { ...q, ...fresh, files: Array.isArray(freshFiles) ? freshFiles : q.files ?? [] }
                : q
            )
          );
        }
      } catch {
        // keep state from PATCH response
      }
      cancelEdit();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update";
      setEditError(msg);
    }
  }

  function openDeleteConfirm(postId: string) {
    setDeleteConfirmId(postId);
  }

  async function handleDeleteConfirmed() {
    const postId = deleteConfirmId;
    if (!postId) return;
    setDeleteConfirmId(null);
    setDeletingId(postId);
    setError("");
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeletingId(null);
    }
  }

  function closeDeleteConfirm() {
    setDeleteConfirmId(null);
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
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-stone-950">
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          Not signed in.{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover font-medium transition">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-stone-950">
      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
          onClick={closeDeleteConfirm}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-surface-border dark:border-stone-600 bg-white dark:bg-stone-900 shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-stone-800 dark:text-stone-100">
              Delete post?
            </h2>
            <p id="delete-dialog-desc" className="text-sm text-stone-600 dark:text-stone-400">
              This will permanently remove this post and any files attached to it. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-600 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500 transition"
              >
                Delete post
              </button>
            </div>
          </div>
        </div>
      )}

      <AppHeader />

      <div className="flex flex-col lg:flex-row lg:min-h-[calc(100vh-4rem)]">
        {/* Tools for Pals — resizable left sidebar on desktop, strip on mobile */}
        <aside
          className="shrink-0 border-b lg:border-b-0 lg:border-r border-surface-border dark:border-stone-700/80 bg-surface-card/50 dark:bg-stone-900/50 relative lg:sticky lg:top-14 lg:self-start lg:h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-3.5rem)]"
          style={isLg ? { width: toolsSidebarWidth } : undefined}
        >
          <div className="px-4 py-4 lg:py-6 lg:px-4 min-w-0">
            <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
              Tools for Pals
            </h2>
            <nav className="flex flex-row gap-2 lg:flex-col lg:gap-2" aria-label="Tools for pals">
              {TOOLS_FOR_PALS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <a
                    key={tool.href}
                    href={tool.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 lg:gap-3 flex-1 lg:flex-initial min-w-0 rounded-xl px-3 py-2.5 lg:px-4 lg:py-3 text-left text-sm font-medium text-stone-700 dark:text-stone-200 bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 border border-surface-border dark:border-stone-700/80 hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
                  >
                    <span className="flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-white dark:bg-stone-800 border border-surface-border dark:border-stone-600 shrink-0">
                      <Icon className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                    </span>
                    <span className="flex-1 min-w-0 break-words">{tool.label}</span>
                    <span className="shrink-0 text-stone-400 dark:text-stone-500 text-xs" aria-hidden>
                      ↗
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>
          {/* Resize handle — desktop only */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize tools panel"
            onMouseDown={startSidebarResize}
            className="hidden lg:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-accent/30 active:bg-accent/50 transition-colors group"
          >
            <span className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-1 h-8 rounded-full bg-stone-300 dark:bg-stone-600 group-hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
        </aside>

        <main className="flex-1 min-w-0 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 lg:py-8">
        {/* Composer card */}
        <div className="bg-surface-card dark:bg-stone-900/80 backdrop-blur rounded-2xl border border-surface-border dark:border-stone-700/80 shadow-soft mb-8 overflow-hidden">
          <form onSubmit={handleUpload}>
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_ACCEPT[uploadMode]}
              multiple
              onChange={(e) => {
                const chosen = Array.from(e.target.files ?? []);
                const allowed = chosen.filter((f) => f.size <= MAX_FILE_SIZE);
                const rejected = chosen.filter((f) => f.size > MAX_FILE_SIZE);
                if (rejected.length) {
                  setError(
                    rejected.length === 1
                      ? "Exceeds the file limit."
                      : "Exceeds the file limit."
                  );
                } else {
                  setError("");
                }
                setFiles((prev) => [...prev, ...allowed]);
                setFormExpanded(true);
                e.target.value = "";
              }}
              className="hidden"
            />
            <div className="p-4 sm:p-5">
              <div
                className="flex items-center gap-3 cursor-text rounded-xl p-2 -m-2 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50"
                onClick={() => setFormExpanded(true)}
              >
                {profile?.avatar_url && process.env.NEXT_PUBLIC_SUPABASE_URL ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover border-2 border-surface-border dark:border-stone-600 shrink-0"
                  />
                ) : (
                  <span className="w-11 h-11 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-600 dark:to-stone-700 border-2 border-surface-border dark:border-stone-600 flex items-center justify-center text-stone-600 dark:text-stone-200 text-sm font-bold shrink-0">
                    {(profile?.display_name || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <button
                  type="button"
                  className="flex-1 text-left text-stone-500 dark:text-stone-400 text-sm py-2.5 px-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-surface-border dark:border-stone-600/80 hover:border-stone-300 dark:hover:border-stone-600 transition"
                  onClick={(e) => {
                    e.preventDefault();
                    setFormExpanded(true);
                  }}
                >
                  What do you want to share?
                </button>
              </div>

              {/* Type selector — always visible */}
              <div className="flex items-center gap-1 mt-4 pt-4 border-t border-surface-border dark:border-stone-700/80">
                <button
                  type="button"
                  onClick={() => openComposer("video")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition min-w-0 ${uploadMode === "video" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"}`}
                >
                  <Video className="w-5 h-5 shrink-0" />
                  <span className="hidden sm:inline">Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => openComposer("photo")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition min-w-0 ${uploadMode === "photo" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"}`}
                >
                  <Image className="w-5 h-5 shrink-0" />
                  <span className="hidden sm:inline">Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => openComposer("file")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition min-w-0 ${uploadMode === "file" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"}`}
                >
                  <FileText className="w-5 h-5 shrink-0" />
                  <span className="hidden sm:inline">File</span>
                </button>
              </div>
            </div>

            {formExpanded && (
              <div className="px-4 sm:px-5 pb-5 pt-0 border-t border-surface-border dark:border-stone-700/80 space-y-4">
                <div>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption…"
                    className="w-full border border-surface-border dark:border-stone-600 rounded-xl px-4 py-3 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800/50 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-accent/30 dark:focus:ring-accent/40 focus:border-accent transition"
                  />
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300 border border-surface-border dark:border-stone-600 rounded-xl px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                  >
                    Add file(s)
                  </button>
                  <span className="text-xs text-stone-500 dark:text-stone-400">Max 50 MB per file</span>
                  {files.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {files.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="inline-flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 rounded-lg pl-2 pr-1 py-1"
                        >
                          <span className="truncate max-w-[160px]">{f.name}</span>
                          <span className="text-xs text-stone-500">({(f.size / 1024).toFixed(1)} KB)</span>
                          <button
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-stone-400 hover:text-rose-500 dark:hover:text-rose-400 p-0.5 rounded"
                            aria-label={`Remove ${f.name}`}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    Visibility
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === "members"}
                      onChange={() => setVisibility("members")}
                      className="text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-stone-700 dark:text-stone-300">Everyone</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === "private"}
                      onChange={() => setVisibility("private")}
                      className="text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-stone-700 dark:text-stone-300">Only me</span>
                  </label>
                </div>
                {error && (
                  <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-4 py-2.5 rounded-xl">
                    {error}
                  </p>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={uploading || (!files.length && !caption.trim())}
                    className="flex-1 bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100 disabled:opacity-50 disabled:pointer-events-none font-semibold py-3 rounded-xl text-sm transition shadow-card"
                  >
                    {uploading ? "Sharing…" : "Share"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormExpanded(false);
                      setCaption("");
                      setFiles([]);
                      setError("");
                    }}
                    className="px-5 py-3 rounded-xl border border-surface-border dark:border-stone-600 text-stone-600 dark:text-stone-300 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Single file input for edit mode - outside post map so ref works */}
        {editingId && (
          <input
            ref={editFileInputRef}
            type="file"
            multiple
            accept={ACCEPT_ALL}
            onChange={(e) => {
              const chosen = Array.from(e.target.files ?? []);
              setEditNewFiles((prev) => [...prev, ...chosen]);
              e.target.value = "";
            }}
            className="hidden"
            aria-hidden
          />
        )}

        {/* Feed section */}
        <section aria-label="Feed">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-border dark:via-stone-700 to-transparent" />
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider shrink-0">
              {mineOnly ? "My posts" : "Shared by everyone"}
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-border dark:via-stone-700 to-transparent" />
          </div>
        {feedLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-card dark:bg-stone-900/80 rounded-2xl border border-surface-border dark:border-stone-700/80 p-5 shadow-card animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-stone-100 dark:bg-stone-700 rounded w-1/3 mb-3" />
                    <div className="h-3 bg-stone-100 dark:bg-stone-700 rounded w-full max-w-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-surface-card dark:bg-stone-900/80 rounded-2xl border border-surface-border dark:border-stone-700/80 border-dashed p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-stone-400 dark:text-stone-500" />
            </div>
            <p className="text-stone-600 dark:text-stone-300 font-medium">
              {feedError
                ? "Couldn't load the feed"
                : mineOnly
                  ? "You haven't shared anything yet"
                  : "No posts yet"}
            </p>
            <p className="text-stone-500 dark:text-stone-500 text-sm mt-1">
              {feedError
                ? feedErrorMessage || "Check your connection and try again."
                : mineOnly
                  ? "Share something above to see it here."
                  : "Share something above, or refresh to see others' posts."}
            </p>
            <button
              type="button"
              onClick={() => refetchFeed()}
              disabled={feedLoading}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-600 disabled:opacity-50 transition"
            >
              {feedLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
        ) : (
          <>
            {feedError && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Showing saved posts. Couldn&apos;t load the latest.
                  {feedErrorMessage && (
                    <span className="block mt-1 text-amber-700 dark:text-amber-300/90 text-xs">
                      {feedErrorMessage}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => refetchFeed()}
                  disabled={feedLoading}
                  className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline disabled:opacity-50"
                >
                  {feedLoading ? "Loading…" : "Refresh"}
                </button>
              </div>
            )}
          <ul className="space-y-5">
            {posts.map((post) => {
              const isOwner = post.user_id === user.id;
              const isEditing = editingId === post.id;
              const isDeleting = deletingId === post.id;
              const rawProfiles = (post as Post & { profiles?: { display_name?: string; username?: string; avatar_url?: string | null } | Array<{ display_name?: string; username?: string; avatar_url?: string | null }> }).profiles;
              const profilesObj = Array.isArray(rawProfiles) ? rawProfiles[0] : rawProfiles;
              const authorName =
                profilesObj?.display_name ?? profilesObj?.username ?? "Someone";
              const authorAvatar = profilesObj?.avatar_url;
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              return (
                <li
                  key={post.id}
                  className="bg-surface-card dark:bg-stone-900/80 rounded-2xl border border-surface-border dark:border-stone-700/80 overflow-hidden shadow-card hover:shadow-cardHover transition"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex gap-4">
                      {authorAvatar && supabaseUrl ? (
                        <img
                          src={`${supabaseUrl}/storage/v1/object/public/avatars/${authorAvatar}`}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover border-2 border-surface-border dark:border-stone-600 shrink-0"
                        />
                      ) : (
                        <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-600 dark:to-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-200 text-lg font-bold">
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-stone-800 dark:text-stone-100">
                            {authorName}
                          </span>
                          {isOwner && post.visibility === "private" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400">
                              Only me
                            </span>
                          )}
                          <span className="text-xs text-stone-400 dark:text-stone-500 tabular-nums">
                            {new Date(post.created_at).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                          {isOwner && (
                            <div className="flex items-center gap-2 ml-auto" role="group" aria-label="Post actions">
                              <button
                                type="button"
                                onClick={() => startEdit(post)}
                                disabled={isEditing || isDeleting}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-50"
                                aria-label="Edit post"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <span className="text-stone-300 dark:text-stone-600">·</span>
                              <button
                                type="button"
                                onClick={() => openDeleteConfirm(post.id)}
                                disabled={isDeleting}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 dark:text-rose-400 hover:text-rose-600 disabled:opacity-50"
                                aria-label="Delete post"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {isDeleting ? "Deleting…" : "Delete"}
                              </button>
                            </div>
                          )}
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => toggleFollow(post.user_id)}
                              disabled={followLoadingId === post.user_id}
                              className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full border transition disabled:opacity-50 ${
                                buddyIds.has(post.user_id)
                                  ? "border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800"
                                  : "border-accent text-accent hover:bg-accent/10 dark:hover:bg-accent/20"
                              }`}
                            >
                              {followLoadingId === post.user_id ? "…" : buddyIds.has(post.user_id) ? "Following" : "Follow"}
                            </button>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="mt-3 space-y-3">
                            {editError && (
                              <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-3 py-2 rounded-xl">
                                {editError}
                              </p>
                            )}
                            <input
                              type="text"
                              value={editCaption}
                              onChange={(e) => setEditCaption(e.target.value)}
                              placeholder="Caption…"
                              className="w-full border border-surface-border dark:border-stone-600 rounded-xl px-3 py-2 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                              autoFocus
                            />
                            <div>
                              <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1.5">Files</label>
                              {(() => {
                                const postFiles = (post as Post & { files?: (PostFile & { signed_url?: string | null })[] }).files;
                                const currentFiles: (PostFile & { signed_url?: string | null })[] =
                                  postFiles?.length
                                    ? postFiles
                                    : post.file_name
                                      ? [{ id: post.id, post_id: post.id, file_url: post.file_url!, file_name: post.file_name, file_type: post.file_type, file_size: post.file_size, created_at: post.created_at, signed_url: (post as Post & { signed_url?: string }).signed_url ?? null }]
                                      : [];
                                const isLegacySingle = !postFiles?.length && !!post.file_name;
                                const remaining = currentFiles.filter((f) => !editFilesToDiscard.includes(f.id));
                                return (
                                  <div className="space-y-2">
                                    {remaining.length > 0 && (
                                      <ul className="space-y-1.5">
                                        {remaining.map((f) => (
                                          <li
                                            key={f.id}
                                            className="flex items-center justify-between gap-2 text-sm text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/50 rounded-lg px-3 py-2"
                                          >
                                            <span className="truncate min-w-0">{f.file_name}</span>
                                            {!isLegacySingle && (
                                            <button
                                              type="button"
                                              onClick={() => setEditFilesToDiscard((prev) => [...prev, f.id])}
                                              className="shrink-0 text-xs font-medium text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300"
                                            >
                                              Discard
                                            </button>
                                          )}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => editFileInputRef.current?.click()}
                                        className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300 border border-surface-border dark:border-stone-600 rounded-lg px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                                      >
                                        Add file(s)
                                      </button>
                                      {editNewFiles.length > 0 && (
                                        <span className="text-xs text-stone-500 dark:text-stone-400">
                                          {editNewFiles.length} new
                                        </span>
                                      )}
                                    </div>
                                    {editNewFiles.map((f, i) => (
                                      <div
                                        key={`new-${i}`}
                                        className="flex items-center justify-between gap-2 text-sm text-stone-600 dark:text-stone-400 bg-accent/10 dark:bg-accent/20 rounded-lg px-3 py-1.5"
                                      >
                                        <span className="truncate min-w-0">{f.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => setEditNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                          className="shrink-0 text-xs text-rose-500 hover:text-rose-600"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs text-stone-500 dark:text-stone-400">Visibility</span>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`edit-visibility-${post.id}`}
                                  checked={editVisibility === "members"}
                                  onChange={() => setEditVisibility("members")}
                                  className="text-accent focus:ring-accent"
                                />
                                <span className="text-xs text-stone-700 dark:text-stone-300">Everyone</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`edit-visibility-${post.id}`}
                                  checked={editVisibility === "private"}
                                  onChange={() => setEditVisibility("private")}
                                  className="text-accent focus:ring-accent"
                                />
                                <span className="text-xs text-stone-700 dark:text-stone-300">Only me</span>
                              </label>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveEdit(post.id)}
                                className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-100"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-3 py-1.5 rounded-lg border border-surface-border dark:border-stone-600 text-stone-600 dark:text-stone-300 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {post.content && (
                              <p className="text-stone-700 dark:text-stone-200 text-sm leading-relaxed mb-2">
                                {post.content}
                              </p>
                            )}
                            {(() => {
                              const filesToShow = (post as Post & { files?: (PostFile & { signed_url?: string | null })[] }).files?.length
                                ? (post as Post & { files?: (PostFile & { signed_url?: string | null })[] }).files!
                                : post.file_name
                                  ? [{ file_name: post.file_name, signed_url: (post as Post & { signed_url?: string }).signed_url }]
                                  : [];
                              return filesToShow.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {filesToShow.map((f, i) => (
                                    (f as { signed_url?: string | null }).signed_url ? (
                                      <a
                                        key={i}
                                        href={(f as { signed_url: string }).signed_url!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover py-1.5 px-3 rounded-lg bg-accent/10 dark:bg-accent/20 hover:bg-accent/20 dark:hover:bg-accent/30 transition"
                                      >
                                        <FileText className="w-4 h-4 shrink-0" />
                                        {(f as { file_name: string }).file_name}
                                        <span aria-hidden className="text-xs">↗</span>
                                      </a>
                                    ) : (
                                      <span key={i} className="inline-flex items-center gap-2 text-stone-500 dark:text-stone-400 text-sm py-1.5 px-3 rounded-lg bg-stone-100 dark:bg-stone-800">
                                        <FileText className="w-4 h-4 shrink-0" />
                                        {(f as { file_name: string }).file_name}
                                      </span>
                                    )
                                  ))}
                                </div>
                              ) : null;
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          </>
        )}
        </section>
        </main>
      </div>
    </div>
  );
}
