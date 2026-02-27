import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 5000;

export type FetchFeedOptions = {
  userId: string;
  limit?: number;
  cursor?: string | null;
  mineOnly?: boolean;
};

const POSTS_SELECT =
  "id, content, file_url, file_name, file_type, file_size, visibility, created_at, updated_at, user_id";

/** Fetch all posts from the posts table (RLS applies: public/members/own/custom). Includes profiles + post_files + signed URLs. */
export async function fetchFeed(
  supabase: SupabaseClient,
  options: FetchFeedOptions
): Promise<{ posts: unknown[]; nextCursor: string | null; hasMore: boolean }> {
  const { userId, limit: limitParam, cursor, mineOnly = false } = options;
  const limit = Math.min(
    Math.max(parseInt(String(limitParam ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  let query = supabase
    .from("posts")
    .select(
      `${POSTS_SELECT}, profiles ( id, username, display_name, avatar_url )`
    )
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (mineOnly) {
    query = query.eq("user_id", userId);
  }
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  let { data, error } = await query;

  // If join fails (e.g. relation name differs in project), fallback to posts only so feed still loads
  if (error) {
    let fallbackQuery = supabase
      .from("posts")
      .select(POSTS_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (mineOnly) fallbackQuery = fallbackQuery.eq("user_id", userId);
    if (cursor) fallbackQuery = fallbackQuery.lt("created_at", cursor);
    const res = await fallbackQuery;
    if (res.error) throw res.error;
    data = res.data;
  }

  const hasMore = (data?.length ?? 0) > limit;
  const rawPosts = hasMore ? data!.slice(0, limit) : data ?? [];
  const nextCursor = hasMore ? (rawPosts[rawPosts.length - 1] as { created_at: string }).created_at : null;

  // When join failed or profiles missing display_name/username, fetch profiles so posts show real names (not "Someone")
  type Row = { user_id?: string; profiles?: unknown };
  const userIds = [...new Set((rawPosts as Row[]).map((p) => p.user_id).filter(Boolean) as string[])];
  const needsProfiles = userIds.length > 0 && (rawPosts as Row[]).some((p) => {
    const pr = p.profiles;
    if (pr == null) return true;
    const obj = Array.isArray(pr) ? pr[0] : pr;
    return !obj || (typeof obj !== "object") || ((obj as { display_name?: string; username?: string }).display_name == null && (obj as { username?: string }).username == null);
  });
  let profileByUserId: Record<string, { id: string; username: string; display_name: string; avatar_url: string | null }> = {};
  if (needsProfiles && userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    if (profileRows?.length) {
      profileByUserId = Object.fromEntries(profileRows.map((r) => [r.id, r]));
    }
  }

  function attachProfile(post: { user_id?: string; profiles?: unknown; [k: string]: unknown }) {
    const fromJoin = post.profiles;
    const profile =
      profileByUserId[post.user_id as string] ??
      (Array.isArray(fromJoin) && fromJoin.length > 0 ? fromJoin[0] : fromJoin);
    return { ...post, profiles: profile ?? null };
  }

  const posts = await Promise.all(
    rawPosts.map(async (p: { id: string; user_id?: string; file_url?: string | null; profiles?: unknown; [k: string]: unknown }) => {
      let postFiles: { id: string; file_url: string; file_name: string; file_type: string | null; file_size: number | null; created_at: string; [k: string]: unknown }[] | null = null;
      try {
        const result = await supabase
          .from("post_files")
          .select("id, file_url, file_name, file_type, file_size, created_at")
          .eq("post_id", p.id)
          .order("created_at", { ascending: true });
        if (!result.error) postFiles = result.data;
      } catch {
        // post_files table missing or RLS error: treat as no extra files
      }

      if (postFiles?.length) {
        const filesWithSigned = await Promise.all(
          postFiles.map(async (f: { file_url: string; [k: string]: unknown }) => {
            const { data: signed } = await supabase.storage
              .from("post-files")
              .createSignedUrl(f.file_url, 3600);
            return { ...f, signed_url: signed?.signedUrl ?? null };
          })
        );
        return attachProfile({ ...p, files: filesWithSigned });
      }
      if (p.file_url) {
        const { data: signed } = await supabase.storage
          .from("post-files")
          .createSignedUrl(p.file_url as string, 3600);
        return attachProfile({ ...p, signed_url: signed?.signedUrl ?? null });
      }
      return attachProfile(p);
    })
  );

  return { posts, nextCursor, hasMore };
}
