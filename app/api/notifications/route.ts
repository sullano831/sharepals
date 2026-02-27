import { createRouteClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Notifications API — Follow events for the notification bell.
 *
 * GET:  Returns people who followed you (excluding dismissed). Each item has
 *       followed_you_back: true if you already follow them.
 * POST: Dismiss one { follower_id, created_at } or all { clearAll: true }.
 *       Dismissals are stored in notification_dismissals and excluded from GET.
 *
 * See docs/NOTIFICATIONS.md for full flow.
 */

/** GET /api/notifications — active (non-dismissed) follow notifications */
export async function GET() {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rows, error } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ data: [] });

  const { data: dismissed, error: dismissedError } = await supabase
    .from("notification_dismissals")
    .select("follower_id, followed_at")
    .eq("user_id", user.id);

  if (dismissedError) {
    // Table may not exist yet (run migrations/004_notification_dismissals.sql); treat as no dismissals
  }

  function dismissalKey(followerId: string, at: string | number | Date): string {
    const ms = typeof at === "string" || typeof at === "number" ? new Date(at).getTime() : at.getTime();
    const sec = Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
    return `${followerId}:${sec}`;
  }
  const dismissedSet = new Set(
    (dismissed ?? []).map((d) => dismissalKey(d.follower_id, d.followed_at))
  );
  const activeRows = rows.filter(
    (r) => !dismissedSet.has(dismissalKey(r.follower_id, r.created_at))
  );
  if (!activeRows.length) return NextResponse.json({ data: [] });

  const ids = [...new Set(activeRows.map((r) => r.follower_id))];

  // Who I follow (so we can mark "followed you back")
  const { data: iFollow } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const iFollowIds = new Set((iFollow ?? []).map((r) => r.following_id));

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const data = activeRows.map((r) => ({
    follower_id: r.follower_id,
    created_at: r.created_at,
    profile: profileMap.get(r.follower_id) ?? null,
    followed_you_back: iFollowIds.has(r.follower_id),
  }));

  return NextResponse.json({ data });
}

type DismissBody = {
  clearAll?: true;
  follower_id?: string;
  created_at?: string;
};

/** POST /api/notifications — dismiss one notification or clear all (persisted in notification_dismissals) */
export async function POST(req: Request) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: DismissBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if ("clearAll" in body && body.clearAll === true) {
    const { data: rows } = await supabase
      .from("follows")
      .select("follower_id, created_at")
      .eq("following_id", user.id);
    if (rows?.length) {
      const toInsert = rows.map((r) => ({
        user_id: user.id,
        follower_id: r.follower_id,
        followed_at: new Date(r.created_at).toISOString(),
      }));
      const { error } = await supabase
        .from("notification_dismissals")
        .upsert(toInsert, {
          onConflict: "user_id,follower_id,followed_at",
          ignoreDuplicates: true,
        });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (typeof body.follower_id === "string" && typeof body.created_at === "string") {
    const followedAt = new Date(body.created_at);
    if (Number.isNaN(followedAt.getTime()))
      return NextResponse.json({ error: "Invalid created_at" }, { status: 400 });
    const { error } = await supabase.from("notification_dismissals").upsert(
      {
        user_id: user.id,
        follower_id: body.follower_id,
        followed_at: followedAt.toISOString(),
      },
      { onConflict: "user_id,follower_id,followed_at", ignoreDuplicates: true }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid body: use clearAll or follower_id+created_at" }, { status: 400 });
}
