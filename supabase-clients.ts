// lib/supabase/client.ts
// Browser-side Supabase client (use in Client Components)
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/types/database'

export const createClient = () => createClientComponentClient<Database>()

// ─────────────────────────────────────────────────────────────

// lib/supabase/server.ts
// Server-side Supabase client (use in Server Components & API Routes)
import { createRouteHandlerClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const createServerClient = () =>
  createServerComponentClient<Database>({ cookies })

export const createRouteClient = () =>
  createRouteHandlerClient<Database>({ cookies })

// ─────────────────────────────────────────────────────────────

// lib/supabase/admin.ts
// Service-role client — NEVER expose to browser
// Only use in trusted server-side contexts (e.g., webhook handlers)
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const createAdminClient = () =>
  createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // NOT the anon key
    { auth: { persistSession: false } }
  )
