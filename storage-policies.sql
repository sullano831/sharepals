-- ============================================================
-- FileFiesta — Supabase Storage Policies
-- Run AFTER creating buckets in the Supabase dashboard.
-- ============================================================
--
-- BUCKET SETUP (do this in dashboard first):
--   1. "post-files"  — Private bucket (public: false)  max size: 100MB
--   2. "avatars"     — Public bucket  (public: true)   max size: 5MB
--
-- FILE PATH CONVENTIONS:
--   post-files : {user_id}/{post_id}/{original_filename}
--   avatars    : {user_id}/avatar.{ext}
-- ============================================================

-- ── post-files bucket ────────────────────────────────────────

-- INSERT: authenticated users can only write to their own folder
DROP POLICY IF EXISTS "post-files: owner insert" ON storage.objects;
CREATE POLICY "post-files: owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-files'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- SELECT: only if the linked post is readable by this user
--   (mirrors the posts SELECT policy logic)
DROP POLICY IF EXISTS "post-files: conditional read" ON storage.objects;
CREATE POLICY "post-files: conditional read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'post-files'
    AND (
      -- Owner always has access
      auth.uid()::text = (storage.foldername(name))[1]
      -- Or the file belongs to a post the user is allowed to read
      --   (members = all signed-in users, public, or custom with access)
      OR EXISTS (
        SELECT 1
        FROM public.posts p
        LEFT JOIN public.post_files pf ON pf.post_id = p.id
        LEFT JOIN public.post_allowed_users pau
          ON pau.post_id = p.id AND pau.user_id = auth.uid()
        WHERE
          (
            -- Legacy single-file path on posts.file_url
            (p.file_url IS NOT NULL AND p.file_url LIKE '%' || name)
            -- Or any attached file in post_files (full path match)
            OR pf.file_url = name
          )
          AND (
            -- Everyone registered can read 'members' posts
            (p.visibility = 'members' AND auth.uid() IS NOT NULL)
            -- Fully public posts
            OR p.visibility = 'public'
            -- Custom posts explicitly granted to this user
            OR (p.visibility = 'custom' AND pau.user_id IS NOT NULL)
          )
      )
    )
  );

-- UPDATE: owner can replace their own files
DROP POLICY IF EXISTS "post-files: owner update" ON storage.objects;
CREATE POLICY "post-files: owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE: owner can delete their own files
DROP POLICY IF EXISTS "post-files: owner delete" ON storage.objects;
CREATE POLICY "post-files: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── avatars bucket ───────────────────────────────────────────

-- Public read (bucket is public, but policy belt-and-suspenders)
DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Owner write
DROP POLICY IF EXISTS "avatars: owner write" ON storage.objects;
CREATE POLICY "avatars: owner write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can update (e.g. replace avatar)
DROP POLICY IF EXISTS "avatars: owner update" ON storage.objects;
CREATE POLICY "avatars: owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars: owner delete" ON storage.objects;
CREATE POLICY "avatars: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
