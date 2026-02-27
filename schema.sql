-- ============================================================
-- FileFiesta — Full PostgreSQL Schema
-- Compatible with Supabase (PostgreSQL 15+)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search

-- ============================================================
-- TABLE: profiles
-- Auto-created on signup via trigger. Extends auth.users.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      text        UNIQUE NOT NULL,
  display_name  text        NOT NULL,
  avatar_url    text,
  bio           text,
  website       text,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.profiles IS 'Public user profile, mirroring auth.users.';

-- ============================================================
-- TABLE: posts
-- Core content unit. Holds text, optional file, optional link.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content          text,
  file_url         text,                     -- path within Supabase storage bucket
  file_name        text,                     -- original filename for display
  file_type        text,                     -- MIME type
  file_size        bigint,                   -- bytes
  external_link    text,                     -- optional external URL
  link_title       text,                     -- scraped/user-provided title
  link_description text,                     -- scraped/user-provided description
  link_image       text,                     -- OG image URL
  visibility       text        NOT NULL DEFAULT 'members'
                               CHECK (visibility IN ('public', 'private', 'custom', 'members')),
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL,

  -- At least one of content, file, or link must be present
  CONSTRAINT posts_has_content CHECK (
    content IS NOT NULL OR file_url IS NOT NULL OR external_link IS NOT NULL
  )
);

COMMENT ON TABLE public.posts IS 'Core post entity supporting text, files, and links.';
COMMENT ON COLUMN public.posts.visibility IS 'public=all users, private=owner only, custom=selected users, members=all registered users.';

-- ============================================================
-- TABLE: post_allowed_users
-- Join table for 'custom' visibility posts.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_allowed_users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by  uuid        NOT NULL REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now() NOT NULL,

  UNIQUE(post_id, user_id)
);

COMMENT ON TABLE public.post_allowed_users IS 'Access list for custom-visibility posts.';

-- ============================================================
-- TABLE: post_files
-- Multiple files per post. Replaces single file on posts for new flow.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_files (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  file_url    text        NOT NULL,
  file_name   text        NOT NULL,
  file_type   text,
  file_size   bigint,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_post_files_post_id ON public.post_files(post_id);
COMMENT ON TABLE public.post_files IS 'Files attached to a post; one post can have multiple files.';

-- ============================================================
-- INDEXES
-- ============================================================

-- Posts: feed ordering (most common query)
CREATE INDEX IF NOT EXISTS idx_posts_created_at    ON public.posts(created_at DESC);
-- Posts: user dashboard
CREATE INDEX IF NOT EXISTS idx_posts_user_id       ON public.posts(user_id);
-- Posts: visibility filter
CREATE INDEX IF NOT EXISTS idx_posts_visibility    ON public.posts(visibility);
-- Posts: combined for feed (visibility + time)
CREATE INDEX IF NOT EXISTS idx_posts_public_feed   ON public.posts(visibility, created_at DESC)
  WHERE visibility = 'public';
-- Posts: full-text search on content
CREATE INDEX IF NOT EXISTS idx_posts_content_fts   ON public.posts USING GIN(to_tsvector('english', coalesce(content, '')));

-- post_allowed_users: lookup by post
CREATE INDEX IF NOT EXISTS idx_pau_post_id         ON public.post_allowed_users(post_id);
-- post_allowed_users: lookup by granted user
CREATE INDEX IF NOT EXISTS idx_pau_user_id         ON public.post_allowed_users(user_id);

-- profiles: username lookup
CREATE INDEX IF NOT EXISTS idx_profiles_username   ON public.profiles(username);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    -- Default username: everything before @ in email, lowercased
    lower(split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_allowed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_files        ENABLE ROW LEVEL SECURITY;

-- ── profiles policies ────────────────────────────────────────

DROP POLICY IF EXISTS "profiles: public read" ON public.profiles;
CREATE POLICY "profiles: public read"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "profiles: owner update" ON public.profiles;
CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── posts policies ───────────────────────────────────────────

DROP POLICY IF EXISTS "posts: select" ON public.posts;
CREATE POLICY "posts: select"
  ON public.posts FOR SELECT
  USING (
    visibility = 'public'
    OR (visibility = 'members' AND auth.uid() IS NOT NULL)
    OR user_id = auth.uid()
    OR (
      visibility = 'custom'
      AND EXISTS (
        SELECT 1 FROM public.post_allowed_users pau
        WHERE pau.post_id = posts.id
          AND pau.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "posts: insert" ON public.posts;
CREATE POLICY "posts: insert"
  ON public.posts FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
  );

DROP POLICY IF EXISTS "posts: update" ON public.posts;
CREATE POLICY "posts: update"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts: delete" ON public.posts;
CREATE POLICY "posts: delete"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- ── post_allowed_users policies ──────────────────────────────

DROP POLICY IF EXISTS "pau: select" ON public.post_allowed_users;
CREATE POLICY "pau: select"
  ON public.post_allowed_users FOR SELECT
  USING (
    granted_by = auth.uid()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "pau: insert" ON public.post_allowed_users;
CREATE POLICY "pau: insert"
  ON public.post_allowed_users FOR INSERT
  WITH CHECK (
    granted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pau: delete" ON public.post_allowed_users;
CREATE POLICY "pau: delete"
  ON public.post_allowed_users FOR DELETE
  USING (granted_by = auth.uid());

-- ── post_files policies (same visibility as parent post) ─────

DROP POLICY IF EXISTS "post_files: select" ON public.post_files;
CREATE POLICY "post_files: select"
  ON public.post_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_files.post_id
        AND (
          p.visibility = 'public'
          OR (p.visibility = 'members' AND auth.uid() IS NOT NULL)
          OR p.user_id = auth.uid()
          OR (p.visibility = 'custom' AND EXISTS (
            SELECT 1 FROM public.post_allowed_users pau
            WHERE pau.post_id = p.id AND pau.user_id = auth.uid()
          ))
        )
    )
  );

DROP POLICY IF EXISTS "post_files: insert" ON public.post_files;
CREATE POLICY "post_files: insert"
  ON public.post_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "post_files: delete" ON public.post_files;
CREATE POLICY "post_files: delete"
  ON public.post_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: follows (buddy list + "who followed you" notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now() NOT NULL,

  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
COMMENT ON TABLE public.follows IS 'Follow relationship: follower_id follows following_id (buddy list).';

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows: select own" ON public.follows;
CREATE POLICY "follows: select own"
  ON public.follows FOR SELECT
  USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows: select as followed" ON public.follows;
CREATE POLICY "follows: select as followed"
  ON public.follows FOR SELECT
  USING (auth.uid() = following_id);

DROP POLICY IF EXISTS "follows: insert own" ON public.follows;
CREATE POLICY "follows: insert own"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id AND auth.uid() != following_id);

DROP POLICY IF EXISTS "follows: delete own" ON public.follows;
CREATE POLICY "follows: delete own"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================
-- TABLE: notification_dismissals (hide "followed you" notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_dismissals (
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  follower_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_at  timestamptz NOT NULL,

  PRIMARY KEY (user_id, follower_id, followed_at)
);

CREATE INDEX IF NOT EXISTS idx_notification_dismissals_user_id ON public.notification_dismissals(user_id);
COMMENT ON TABLE public.notification_dismissals IS 'Notifications the user has dismissed (follow events).';

ALTER TABLE public.notification_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_dismissals: select own" ON public.notification_dismissals;
CREATE POLICY "notification_dismissals: select own"
  ON public.notification_dismissals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_dismissals: insert own" ON public.notification_dismissals;
CREATE POLICY "notification_dismissals: insert own"
  ON public.notification_dismissals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_dismissals: update own" ON public.notification_dismissals;
CREATE POLICY "notification_dismissals: update own"
  ON public.notification_dismissals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_dismissals: delete own" ON public.notification_dismissals;
CREATE POLICY "notification_dismissals: delete own"
  ON public.notification_dismissals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- MIGRATION: Add 'members' visibility (for existing databases)
-- Safe to run: adds 'members' to allowed values and sets default.
-- ============================================================
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.posts'::regclass AND contype = 'c'
      AND conname LIKE '%visibility%'
  LOOP
    EXECUTE format('ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS %I', cname);
  END LOOP;
END $$;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_visibility_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_visibility_check
  CHECK (visibility IN ('public', 'private', 'custom', 'members'));
ALTER TABLE public.posts ALTER COLUMN visibility SET DEFAULT 'members';

-- ============================================================
-- MIGRATION: Backfill post_files from posts.file_* (one row per post that has a file)
-- ============================================================
INSERT INTO public.post_files (post_id, file_url, file_name, file_type, file_size)
SELECT id, file_url, file_name, file_type, file_size
FROM public.posts
WHERE file_url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.post_files pf WHERE pf.post_id = posts.id);
