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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const postId = formData.get("postId") as string | null;

  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 50MB limit" },
      { status: 413 }
    );
  }

  const isAllowed =
    ALLOWED_TYPES.includes(file.type) || file.type.startsWith("video/");
  if (!isAllowed) {
    return NextResponse.json(
      { error: "File type not allowed" },
      { status: 415 }
    );
  }

  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Unique path per upload so "Add file(s)" never hits "resource already exists"
  const uniqueId = crypto.randomUUID();
  const path = postId
    ? `${user.id}/${postId}/${uniqueId}/${safeFilename}`
    : `${user.id}/${uniqueId}/${safeFilename}`;

  const { error } = await supabase.storage.from("post-files").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    {
      path,
      name: file.name,
      type: file.type,
      size: file.size,
    },
    { status: 201 }
  );
}
