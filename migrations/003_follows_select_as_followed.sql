-- Allow users to see rows where they are the one being followed (for "who followed you" notifications)
DROP POLICY IF EXISTS "follows: select as followed" ON public.follows;
CREATE POLICY "follows: select as followed"
  ON public.follows FOR SELECT
  USING (auth.uid() = following_id);
