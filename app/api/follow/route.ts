import { createRouteClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/follow — follow a user. Body: { userId: string } */
export async function POST(req: NextRequest) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const followingId = body.userId;
  if (!followingId || typeof followingId !== "string")
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (followingId === user.id)
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const { error } = await supabase.from("follows").insert({
    follower_id: user.id,
    following_id: followingId,
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Already following" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/follow?userId= — unfollow a user */
export async function DELETE(req: NextRequest) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const followingId = searchParams.get("userId");
  if (!followingId)
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", followingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
