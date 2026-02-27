import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client. Uses same cookie format as server so session is shared after login. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
