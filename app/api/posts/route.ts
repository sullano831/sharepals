import { fetchFeed } from "@/lib/feed";
import { createRouteClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { CreatePostPayload } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

// Feed: posts you can see (shared with everyone + your own private posts). RLS enforces visibility.
export async function GET(req: NextRequest) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to see shared files" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const mineOnly = searchParams.get("mine") === "1";

  try {
    const { posts, nextCursor, hasMore } = await fetchFeed(supabase, {
      userId: user.id,
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
      cursor,
      mineOnly,
    });
    return NextResponse.json(
      { data: posts, nextCursor, hasMore },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load feed";
    return NextResponse.json(
      { error: message, code: "FEED_ERROR" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreatePostPayload = await req.json();
  const { allowed_user_ids, files: filesArray, ...postData } = body;

  const hasFiles = filesArray?.length || postData.file_url;
  if (!postData.content && !hasFiles) {
    return NextResponse.json(
      { error: "Add a file or a caption" },
      { status: 400 }
    );
  }

  const visibility = postData.visibility ?? "members";
  const insertPayload: Record<string, unknown> = {
    ...postData,
    user_id: user.id,
    visibility: visibility === "custom" ? "members" : visibility,
  };

  // If multiple files: set first as post.file_* for constraint, then add all to post_files
  if (filesArray?.length) {
    const first = filesArray[0];
    insertPayload.file_url = first.path;
    insertPayload.file_name = first.name;
    insertPayload.file_type = first.type;
    insertPayload.file_size = first.size;
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (filesArray?.length) {
    await supabase.from("post_files").insert(
      filesArray.map((f: { path: string; name: string; type: string; size: number }) => ({
        post_id: post.id,
        file_url: f.path,
        file_name: f.name,
        file_type: f.type,
        file_size: f.size,
      }))
    );
  }

  // Return post with files[] for consistency
  const { data: postFiles } = await supabase
    .from("post_files")
    .select("id, file_url, file_name, file_type, file_size, created_at")
    .eq("post_id", post.id)
    .order("created_at", { ascending: true });

  let files = [] as { [k: string]: unknown }[];
  if (postFiles?.length) {
    files = await Promise.all(
      postFiles.map(async (f) => {
        const { data: signed } = await supabase.storage
          .from("post-files")
          .createSignedUrl(f.file_url as string, 3600);
        return { ...f, signed_url: signed?.signedUrl ?? null };
      })
    );
  } else if (post.file_url) {
    const { data: signed } = await supabase.storage
      .from("post-files")
      .createSignedUrl(post.file_url, 3600);
    files = [{ id: post.id, file_url: post.file_url, file_name: post.file_name ?? "", file_type: post.file_type ?? null, file_size: post.file_size ?? null, created_at: post.created_at, signed_url: signed?.signedUrl ?? null }];
  }
  return NextResponse.json({ ...post, files }, { status: 201 });
}
