-- ============================================================
-- Run this in Supabase Dashboard → SQL Editor → New query
-- Then click "Run". This fixes posts not showing on the dashboard.
-- ============================================================

-- 1. Ensure RLS is enabled on posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 2. Replace the SELECT policy so you can see:
--    - Your own posts (any visibility)
--    - Public posts
--    - Members posts when logged in
--    - Custom posts you're allowed to see
DROP POLICY IF EXISTS "posts: select" ON public.posts;
CREATE POLICY "posts: select"
  ON public.posts FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR visibility = 'public'
    OR (visibility = 'members' AND auth.uid() IS NOT NULL)
    OR (
      visibility = 'custom'
      AND EXISTS (
        SELECT 1 FROM public.post_allowed_users pau
        WHERE pau.post_id = posts.id AND pau.user_id = auth.uid()
      )
    )
  );

-- 3. Same for post_files so file links work
DROP POLICY IF EXISTS "post_files: select" ON public.post_files;
CREATE POLICY "post_files: select"
  ON public.post_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_files.post_id
        AND (
          (auth.uid() IS NOT NULL AND p.user_id = auth.uid())
          OR p.visibility = 'public'
          OR (p.visibility = 'members' AND auth.uid() IS NOT NULL)
          OR (p.visibility = 'custom' AND EXISTS (
            SELECT 1 FROM public.post_allowed_users pau
            WHERE pau.post_id = p.id AND pau.user_id = auth.uid()
          ))
        )
    )
  );
