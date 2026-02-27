-- ============================================================
-- TABLE: notification_dismissals
-- User-dismissed "follow" notifications (so they don't show again)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_dismissals (
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  follower_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_at  timestamptz NOT NULL,

  PRIMARY KEY (user_id, follower_id, followed_at)
);

CREATE INDEX IF NOT EXISTS idx_notification_dismissals_user_id ON public.notification_dismissals(user_id);
COMMENT ON TABLE public.notification_dismissals IS 'Notifications the user has dismissed (follow events).';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
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
