// ============================================================
// FileFiesta — Next.js API Routes (App Router)
// All files live under app/api/
// ============================================================

// ────────────────────────────────────────────────────────────
// FILE: app/api/posts/route.ts
// GET  /api/posts        — Public feed (cursor-paginated)
// POST /api/posts        — Create a new post
// ────────────────────────────────────────────────────────────
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { CreatePostPayload } from '@/lib/types/database'

const PAGE_SIZE = 20

// GET /api/posts?cursor=<created_at>&limit=20
export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  let query = supabase
    .from('posts')
    .select(`
      id, content, file_url, file_name, file_type, file_size,
      external_link, link_title, link_description, link_image,
      visibility, created_at, updated_at,
      profiles ( id, username, display_name, avatar_url )
    `)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit + 1) // fetch one extra to detect hasMore

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const hasMore = data.length > limit
  const posts = hasMore ? data.slice(0, limit) : data
  const nextCursor = hasMore ? posts[posts.length - 1].created_at : null

  return NextResponse.json({ data: posts, nextCursor, hasMore })
}

// POST /api/posts
export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: CreatePostPayload = await req.json()
  const { allowed_user_ids, ...postData } = body

  // Validate at least one content field
  if (!postData.content && !postData.file_url && !postData.external_link) {
    return NextResponse.json(
      { error: 'Post must have content, a file, or a link' },
      { status: 400 }
    )
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({ ...postData, user_id: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If custom visibility, insert allowed users
  if (postData.visibility === 'custom' && allowed_user_ids?.length) {
    const grants = allowed_user_ids.map(uid => ({
      post_id: post.id,
      user_id: uid,
      granted_by: user.id,
    }))
    const { error: grantError } = await supabase
      .from('post_allowed_users')
      .insert(grants)

    if (grantError) {
      // Roll back the post if grants fail
      await supabase.from('posts').delete().eq('id', post.id)
      return NextResponse.json({ error: grantError.message }, { status: 500 })
    }
  }

  return NextResponse.json(post, { status: 201 })
}


// ────────────────────────────────────────────────────────────
// FILE: app/api/posts/[id]/route.ts
// GET    /api/posts/:id  — Fetch single post (visibility enforced by RLS)
// PATCH  /api/posts/:id  — Update post (owner only, enforced by RLS)
// DELETE /api/posts/:id  — Delete post + associated file
// ────────────────────────────────────────────────────────────

export async function GET_SINGLE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles ( id, username, display_name, avatar_url )
    `)
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // Generate signed URL for private/custom files
  let signed_url: string | null = null
  if (data.file_url) {
    const { data: signed } = await supabase.storage
      .from('post-files')
      .createSignedUrl(data.file_url, 3600) // 1-hour TTL
    signed_url = signed?.signedUrl ?? null
  }

  return NextResponse.json({ ...data, signed_url })
}

export async function PATCH_POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { allowed_user_ids, ...updates } = body

  // RLS will reject if user doesn't own the post
  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync allowed users if visibility changed to custom
  if (updates.visibility === 'custom' && allowed_user_ids) {
    await supabase.from('post_allowed_users').delete().eq('post_id', params.id)
    if (allowed_user_ids.length > 0) {
      await supabase.from('post_allowed_users').insert(
        allowed_user_ids.map((uid: string) => ({
          post_id: params.id,
          user_id: uid,
          granted_by: user.id,
        }))
      )
    }
  }

  return NextResponse.json(data)
}

export async function DELETE_POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch post to get file path before deletion
  const { data: post } = await supabase
    .from('posts')
    .select('file_url, user_id')
    .eq('id', params.id)
    .single()

  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (post.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Delete from storage first
  if (post.file_url) {
    await supabase.storage.from('post-files').remove([post.file_url])
  }

  // RLS enforces ownership; delete cascades to post_allowed_users
  const { error } = await supabase.from('posts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}


// ────────────────────────────────────────────────────────────
// FILE: app/api/posts/mine/route.ts
// GET /api/posts/mine — Current user's posts (all visibilities)
// ────────────────────────────────────────────────────────────

export async function GET_MINE(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const visibility = searchParams.get('visibility') // optional filter
  const cursor = searchParams.get('cursor')

  let query = supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(21)

  if (visibility) query = query.eq('visibility', visibility)
  if (cursor) query = query.lt('created_at', cursor)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hasMore = data.length > 20
  const posts = hasMore ? data.slice(0, 20) : data

  // Generate signed URLs for files
  const postsWithUrls = await Promise.all(
    posts.map(async (post) => {
      if (!post.file_url) return post
      const { data: signed } = await supabase.storage
        .from('post-files')
        .createSignedUrl(post.file_url, 3600)
      return { ...post, signed_url: signed?.signedUrl ?? null }
    })
  )

  return NextResponse.json({
    data: postsWithUrls,
    nextCursor: hasMore ? posts[posts.length - 1].created_at : null,
    hasMore,
  })
}


// ────────────────────────────────────────────────────────────
// FILE: app/api/upload/route.ts
// POST /api/upload — Upload a file to Supabase Storage
//                    Returns the storage path (not a URL)
// ────────────────────────────────────────────────────────────

export async function UPLOAD_FILE(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const postId = formData.get('postId') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Enforce 50MB limit server-side
  const MAX_SIZE = 50 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds 50MB limit' }, { status: 413 })
  }

  // Allowed MIME types
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/wav',
    'application/zip', 'text/plain', 'text/csv',
  ]

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 415 })
  }

  // Sanitize filename
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const id = postId ?? crypto.randomUUID()
  const path = `${user.id}/${id}/${safeFilename}`

  const { error } = await supabase.storage
    .from('post-files')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    path,
    name: file.name,
    type: file.type,
    size: file.size,
  }, { status: 201 })
}
