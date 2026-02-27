-- Run this in Supabase Dashboard → SQL Editor if "Shared by everyone" is empty
-- but you have posts. Re-applies the SELECT policies so the feed works.

-- POSTS: allow logged-in users to see public/members posts
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

-- POST_FILES: same visibility as parent post
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
