import { createRouteClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const visibility = searchParams.get("visibility");
  const cursor = searchParams.get("cursor");

  let query = supabase
    .from("posts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(21);

  if (visibility) query = query.eq("visibility", visibility);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (data?.length ?? 0) > 20;
  const posts = hasMore ? data!.slice(0, 20) : data ?? [];

  const postsWithUrls = await Promise.all(
    posts.map(async (post) => {
      if (!post.file_url) return post;
      const { data: signed } = await supabase.storage
        .from("post-files")
        .createSignedUrl(post.file_url, 3600);
      return { ...post, signed_url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({
    data: postsWithUrls,
    nextCursor: hasMore ? posts[posts.length - 1].created_at : null,
    hasMore,
  });
}
