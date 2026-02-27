-- ============================================================
-- TABLE: follows (user follows another user → buddy list)
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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Users can see their own follow list (who they follow)
DROP POLICY IF EXISTS "follows: select own" ON public.follows;
CREATE POLICY "follows: select own"
  ON public.follows FOR SELECT
  USING (auth.uid() = follower_id);

-- Users can add a follow (only as follower = self)
DROP POLICY IF EXISTS "follows: insert own" ON public.follows;
CREATE POLICY "follows: insert own"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id AND auth.uid() != following_id);

-- Users can remove a follow (only their own)
DROP POLICY IF EXISTS "follows: delete own" ON public.follows;
CREATE POLICY "follows: delete own"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);
