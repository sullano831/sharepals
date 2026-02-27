// lib/types/database.ts
// Auto-generate the full version with: npx supabase gen types typescript --project-id <id>
// This is the hand-written minimal version for bootstrapping.

export type Visibility = 'public' | 'private' | 'custom'

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  website: string | null
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string | null
  file_url: string | null
  file_name: string | null
  file_type: string | null
  file_size: number | null
  external_link: string | null
  link_title: string | null
  link_description: string | null
  link_image: string | null
  visibility: Visibility
  created_at: string
  updated_at: string
  // Joined fields (from queries)
  profiles?: Profile
  signed_url?: string       // generated server-side for private files
  allowed_users?: Profile[] // for custom posts
}

export interface PostAllowedUser {
  id: string
  post_id: string
  user_id: string
  granted_by: string
  created_at: string
  profiles?: Profile
}

// ── API Request/Response types ────────────────────────────────

export interface CreatePostPayload {
  content?: string
  file_url?: string
  file_name?: string
  file_type?: string
  file_size?: number
  external_link?: string
  link_title?: string
  link_description?: string
  link_image?: string
  visibility: Visibility
  allowed_user_ids?: string[] // for custom visibility
}

export interface UpdatePostPayload {
  content?: string
  external_link?: string
  link_title?: string
  link_description?: string
  visibility?: Visibility
  allowed_user_ids?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface ApiError {
  error: string
  code?: string
}
