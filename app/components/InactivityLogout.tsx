"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IDLE_MS = 3 * 60 * 60 * 1000; // 3 hours
const THROTTLE_MS = 60 * 1000; // only reset timer at most once per minute

export default function InactivityLogout() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResetRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    clearTimer();
    const supabase = createClient();
    supabase.auth.signOut().finally(() => {
      router.push("/login");
      router.refresh();
    });
  }, [clearTimer, router]);

  const scheduleLogout = useCallback(() => {
    clearTimer();
    timeoutRef.current = setTimeout(logout, IDLE_MS);
    lastResetRef.current = Date.now();
  }, [clearTimer, logout]);

  const onActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastResetRef.current < THROTTLE_MS) return;
    scheduleLogout();
  }, [scheduleLogout]);

  useEffect(() => {
    const supabase = createClient();

    const checkAndStart = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) {
          clearTimer();
          return;
        }
        scheduleLogout();
      });
    };

    checkAndStart();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        scheduleLogout();
      } else {
        clearTimer();
      }
    });

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"] as const;
    events.forEach((ev) => window.addEventListener(ev, onActivity));

    return () => {
      subscription.unsubscribe();
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearTimer();
    };
  }, [onActivity, scheduleLogout, clearTimer]);

  return null;
}
