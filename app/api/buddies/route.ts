import { createRouteClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** GET /api/buddies — returns users the current user follows (buddy list) */
export async function GET() {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: follows, error: followError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if (followError)
    return NextResponse.json({ error: followError.message }, { status: 500 });
  if (!follows?.length)
    return NextResponse.json({ data: [] });

  const ids = follows.map((r) => r.following_id);
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);

  if (profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 });

  return NextResponse.json({ data: profiles ?? [] });
}
