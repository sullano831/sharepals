import { createServerClient as createServerClientSSR } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Shared implementation: create Supabase client with cookies (Next.js 15 async cookies). */
async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }
  const cookieStore = await cookies();
  return createServerClientSSR(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies; Route Handlers can
          }
        },
      },
    }
  );
}

/** @deprecated Use createServerClientAsync for Server Components. */
export const createServerClient = () => {
  throw new Error(
    "Use createServerClientAsync() (await) for Server Components in Next.js 15"
  );
};

/** Use in Route Handlers (e.g. API routes): await createRouteClient() */
export async function createRouteClient() {
  return createSupabaseServerClient();
}

/** Use in Server Components: await this so cookies() is awaited (Next.js 15). */
export async function createServerClientAsync() {
  return createSupabaseServerClient();
}
