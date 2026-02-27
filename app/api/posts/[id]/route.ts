import { createRouteClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { UpdatePostPayload } from "@/lib/types/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createRouteClient();

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles ( id, username, display_name, avatar_url )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const post = data as { id: string; file_url?: string | null; file_name?: string | null; file_type?: string | null; file_size?: number | null; created_at?: string; [k: string]: unknown };
  const { data: postFiles } = await supabase
    .from("post_files")
    .select("id, file_url, file_name, file_type, file_size, created_at")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  if (postFiles?.length) {
    const files = await Promise.all(
      postFiles.map(async (f: { file_url: string; [k: string]: unknown }) => {
        const { data: signed } = await supabase.storage
          .from("post-files")
          .createSignedUrl(f.file_url, 3600);
        return { ...f, signed_url: signed?.signedUrl ?? null };
      })
    );
    return NextResponse.json({ ...(data as Record<string, unknown>), files });
  }
  let signed_url: string | null = null;
  if (post.file_url) {
    const { data: signed } = await supabase.storage
      .from("post-files")
      .createSignedUrl(post.file_url, 3600);
    signed_url = signed?.signedUrl ?? null;
  }
  return NextResponse.json({ ...(data as Record<string, unknown>), signed_url });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    allowed_user_ids,
    discard_file_ids,
    new_files,
    ...updates
  } = body as UpdatePostPayload & {
    allowed_user_ids?: string[];
    file_url?: string;
    file_name?: string;
    file_type?: string;
    file_size?: number;
  };

  // Verify ownership
  const { data: postRow } = await supabase
    .from("posts")
    .select("user_id, file_url")
    .eq("id", id)
    .single();
  if (!postRow || postRow.user_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Discard selected files: delete from post_files and remove from storage
  if (discard_file_ids?.length) {
    const { data: toRemove } = await supabase
      .from("post_files")
      .select("id, file_url")
      .in("id", discard_file_ids)
      .eq("post_id", id);
    if (toRemove?.length) {
      await supabase.storage.from("post-files").remove(toRemove.map((r: { file_url: string }) => r.file_url));
      await supabase.from("post_files").delete().in("id", toRemove.map((r: { id: string }) => r.id));
    }
  }

  // Add new files
  if (new_files?.length) {
    const { error: insertErr } = await supabase.from("post_files").insert(
      new_files.map((f: { path: string; name: string; type: string; size: number }) => ({
        post_id: id,
        file_url: f.path,
        file_name: f.name,
        file_type: f.type,
        file_size: f.size,
      }))
    );
    if (insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Sync posts.file_* with first remaining post_file (or clear if none)
  const { data: remainingFiles } = await supabase
    .from("post_files")
    .select("file_url, file_name, file_type, file_size")
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .limit(1);

  const postUpdates: Record<string, unknown> = { ...updates };
  if (remainingFiles?.length) {
    postUpdates.file_url = remainingFiles[0].file_url;
    postUpdates.file_name = remainingFiles[0].file_name;
    postUpdates.file_type = remainingFiles[0].file_type;
    postUpdates.file_size = remainingFiles[0].file_size;
  } else {
    postUpdates.file_url = null;
    postUpdates.file_name = null;
    postUpdates.file_type = null;
    postUpdates.file_size = null;
  }

  const { data, error } = await supabase
    .from("posts")
    .update(postUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  if (updates.visibility === "custom" && allowed_user_ids) {
    await supabase
      .from("post_allowed_users")
      .delete()
      .eq("post_id", id);
    if (allowed_user_ids.length > 0) {
      await supabase.from("post_allowed_users").insert(
        allowed_user_ids.map((uid: string) => ({
          post_id: id,
          user_id: uid,
          granted_by: user.id,
        }))
      );
    }
  }

  // Return with files[] and signed URLs
  const { data: allFiles } = await supabase
    .from("post_files")
    .select("id, file_url, file_name, file_type, file_size, created_at")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  let files = (allFiles ?? []) as { [k: string]: unknown }[];
  if (files.length) {
    files = await Promise.all(
      files.map(async (f) => {
        const { data: signed } = await supabase.storage
          .from("post-files")
          .createSignedUrl(f.file_url as string, 3600);
        return { ...f, signed_url: signed?.signedUrl ?? null };
      })
    );
  } else if (data?.file_url) {
    const { data: signed } = await supabase.storage
      .from("post-files")
      .createSignedUrl(data.file_url as string, 3600);
    files = [{ id: data.id, file_url: data.file_url, file_name: data.file_name ?? "", file_type: data.file_type ?? null, file_size: data.file_size ?? null, created_at: data.created_at, signed_url: signed?.signedUrl ?? null }];
  }

  return NextResponse.json({ ...(data as Record<string, unknown>), files });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: post } = await supabase
    .from("posts")
    .select("file_url, user_id")
    .eq("id", id)
    .single();

  if (!post)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.user_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (post.file_url) {
    await supabase.storage.from("post-files").remove([post.file_url]);
  }

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
