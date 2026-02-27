// App types + minimal Supabase Database shape for client generics
export type Visibility = "public" | "private" | "custom" | "members";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostFile {
  id: string;
  post_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  signed_url?: string | null;
}

export interface Post {
  id: string;
  user_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  external_link: string | null;
  link_title: string | null;
  link_description: string | null;
  link_image: string | null;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  signed_url?: string;
  allowed_users?: Profile[];
  /** When using multiple files, API returns this; otherwise use file_url/file_name/signed_url */
  files?: PostFile[];
}

export interface PostAllowedUser {
  id: string;
  post_id: string;
  user_id: string;
  granted_by: string;
  created_at: string;
  profiles?: Profile;
}

export interface CreatePostPayload {
  content?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  /** Multiple files: send array; API will store in post_files */
  files?: { path: string; name: string; type: string; size: number }[];
  external_link?: string;
  link_title?: string;
  link_description?: string;
  link_image?: string;
  visibility: Visibility;
  allowed_user_ids?: string[];
}

export interface UpdatePostPayload {
  content?: string;
  external_link?: string;
  link_title?: string;
  link_description?: string;
  visibility?: Visibility;
  allowed_user_ids?: string[];
  /** IDs of post_files to remove (discard) */
  discard_file_ids?: string[];
  /** Newly uploaded files to attach */
  new_files?: { path: string; name: string; type: string; size: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  code?: string;
}

// Database type for app use; generate full Supabase types with:
// npx supabase gen types typescript --project-id <id> > lib/types/supabase.ts
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      posts: { Row: Post; Insert: Partial<Post> & { user_id: string }; Update: Partial<Post> };
      post_allowed_users: {
        Row: PostAllowedUser;
        Insert: { post_id: string; user_id: string; granted_by: string };
        Update: Partial<PostAllowedUser>;
      };
    };
  };
}
