// ============================================================
// FileFiesta — Example Database Queries
// All queries use supabase-js v2 with TypeScript
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ────────────────────────────────────────────────────────────
// 1. PUBLIC FEED — cursor-paginated
//    Returns newest public posts, joining author profile.
//    RLS automatically filters to visibility='public' for
//    unauthenticated users, but we also filter explicitly.
// ────────────────────────────────────────────────────────────
export async function getPublicFeed(cursor?: string, limit = 20) {
  let query = supabase
    .from('posts')
    .select(`
      id, content, file_url, file_name, file_type,
      external_link, link_title, link_description, link_image,
      visibility, created_at,
      profiles (
        id, username, display_name, avatar_url
      )
    `)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) throw error

  const hasMore = data.length > limit
  return {
    posts: hasMore ? data.slice(0, limit) : data,
    nextCursor: hasMore ? data[limit - 1].created_at : null,
    hasMore,
  }
}


// ────────────────────────────────────────────────────────────
// 2. PRIVATE DASHBOARD QUERY
//    All posts owned by the current user, any visibility.
//    RLS guarantees only the owner sees private/custom posts.
// ────────────────────────────────────────────────────────────
export async function getMyDashboard(
  userId: string,
  visibility?: 'public' | 'private' | 'custom',
  cursor?: string
) {
  let query = supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(21)

  if (visibility) {
    query = query.eq('visibility', visibility)
  }

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query
  if (error) throw error

  const hasMore = data.length > 20
  return {
    posts: hasMore ? data.slice(0, 20) : data,
    nextCursor: hasMore ? data[19].created_at : null,
    hasMore,
  }
}


// ────────────────────────────────────────────────────────────
// 3. CUSTOM VISIBILITY QUERY WITH JOIN
//    "Posts I can see that are custom-visibility"
//    This relies on the posts SELECT RLS policy which checks
//    post_allowed_users. We demonstrate the explicit join too.
// ────────────────────────────────────────────────────────────
export async function getCustomPostsGrantedToMe(userId: string) {
  // Option A: Let RLS handle it — just query posts with visibility=custom
  // RLS SELECT policy already checks post_allowed_users for custom posts
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles ( id, username, display_name, avatar_url )
    `)
    .eq('visibility', 'custom')
    .neq('user_id', userId) // exclude own posts (already in dashboard)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Option B: Explicit join (useful for admin/reporting contexts)
export async function getCustomPostsExplicit(userId: string) {
  const { data, error } = await supabase
    .from('post_allowed_users')
    .select(`
      post_id,
      posts (
        id, content, file_url, file_name, visibility, created_at,
        profiles ( id, username, display_name, avatar_url )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false, foreignTable: 'posts' })

  if (error) throw error
  return data?.map(row => row.posts).filter(Boolean) ?? []
}


// ────────────────────────────────────────────────────────────
// 4. FULL-TEXT SEARCH on public posts
// ────────────────────────────────────────────────────────────
export async function searchPublicPosts(query: string, limit = 20) {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, content, external_link, link_title, created_at,
      profiles ( id, username, display_name, avatar_url )
    `)
    .eq('visibility', 'public')
    .textSearch('content', query, {
      type: 'websearch',     // supports AND, OR, phrases
      config: 'english',
    })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}


// ────────────────────────────────────────────────────────────
// 5. USER PROFILE PAGE — profile + public posts
// ────────────────────────────────────────────────────────────
export async function getUserProfile(username: string) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (profileError || !profile) throw new Error('User not found')

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, content, file_url, file_name, external_link, link_title, created_at')
    .eq('user_id', profile.id)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(30)

  if (postsError) throw postsError

  return { profile, posts }
}


// ────────────────────────────────────────────────────────────
// 6. MANAGE CUSTOM ACCESS — grant/revoke specific users
// ────────────────────────────────────────────────────────────
export async function grantAccess(postId: string, targetUserIds: string[], granterId: string) {
  const grants = targetUserIds.map(uid => ({
    post_id: postId,
    user_id: uid,
    granted_by: granterId,
  }))

  const { error } = await supabase
    .from('post_allowed_users')
    .upsert(grants, { onConflict: 'post_id,user_id' })

  if (error) throw error
}

export async function revokeAccess(postId: string, targetUserId: string) {
  const { error } = await supabase
    .from('post_allowed_users')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', targetUserId)

  if (error) throw error
}

export async function getGrantedUsers(postId: string) {
  const { data, error } = await supabase
    .from('post_allowed_users')
    .select(`
      user_id,
      profiles ( id, username, display_name, avatar_url )
    `)
    .eq('post_id', postId)

  if (error) throw error
  return data?.map(row => row.profiles) ?? []
}


// ────────────────────────────────────────────────────────────
// 7. SIGNED URL — for serving private files securely
//    Always generate fresh signed URL server-side.
//    Never store signed URLs in the database.
// ────────────────────────────────────────────────────────────
export async function getSignedFileUrl(filePath: string, ttlSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from('post-files')
    .createSignedUrl(filePath, ttlSeconds)

  if (error) throw error
  return data.signedUrl
}


// ────────────────────────────────────────────────────────────
// 8. STATS — post counts per visibility (dashboard summary)
// ────────────────────────────────────────────────────────────
export async function getPostStats(userId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('visibility')
    .eq('user_id', userId)

  if (error) throw error

  return {
    total:   data.length,
    public:  data.filter(p => p.visibility === 'public').length,
    private: data.filter(p => p.visibility === 'private').length,
    custom:  data.filter(p => p.visibility === 'custom').length,
  }
}
