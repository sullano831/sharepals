-- Run this in Supabase Dashboard → SQL Editor.
-- Creates post_files and ensures posts shared with "Everyone" (public/members)
-- are visible in "Shared by everyone" and their files are readable.

-- ============================================================
-- POSTS: allow all logged-in users to see public/members posts
-- ============================================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

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
        WHERE pau.post_id = posts.id AND pau.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- TABLE: post_files (multiple files per post)
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
-- ROW LEVEL SECURITY (post_files: same visibility as parent post)
-- ============================================================
ALTER TABLE public.post_files ENABLE ROW LEVEL SECURITY;

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
-- Backfill: copy existing single-file posts into post_files
-- ============================================================
INSERT INTO public.post_files (post_id, file_url, file_name, file_type, file_size)
SELECT id, file_url, file_name, file_type, file_size
FROM public.posts
WHERE file_url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.post_files pf WHERE pf.post_id = posts.id);
