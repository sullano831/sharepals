import { createRouteClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "application/zip",
  "text/plain",
  "text/csv",
];

export async function POST(req: NextRequest) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { filename?: string; contentType?: string; size?: number; postId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { filename, contentType, size, postId } = body;
  if (!filename || typeof filename !== "string")
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  if (size != null && (typeof size !== "number" || size > MAX_SIZE))
    return NextResponse.json(
      { error: "File exceeds 50MB limit" },
      { status: 413 }
    );

  const type = contentType ?? "";
  const isAllowed =
    ALLOWED_TYPES.includes(type) || type.startsWith("video/");
  if (!isAllowed)
    return NextResponse.json(
      { error: "File type not allowed" },
      { status: 415 }
    );

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueId = crypto.randomUUID();
  const path =
    postId && typeof postId === "string"
      ? `${user.id}/${postId}/${uniqueId}/${safeFilename}`
      : `${user.id}/${uniqueId}/${safeFilename}`;

  const { data, error } = await supabase.storage
    .from("post-files")
    .createSignedUploadUrl(path);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const token = (data as { token?: string })?.token;
  if (!token)
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  return NextResponse.json({ path, token }, { status: 201 });
}
