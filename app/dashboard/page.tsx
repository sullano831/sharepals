import { redirect } from "next/navigation";
import { fetchFeed } from "@/lib/feed";
import { createServerClientAsync } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ mine?: string }> };

/** Load feed on the server so posts stay visible after refresh (session from cookie; RLS must allow SELECT for your posts). */
export default async function DashboardPage({ searchParams }: PageProps) {
  try {
    const supabase = await createServerClientAsync();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login?redirect=/dashboard");
    }

    const params = await searchParams;
    const mineOnly = params?.mine === "1";

    let initialPosts: unknown[] = [];
    let hasServerFeed = false;
    try {
      const feed = await fetchFeed(supabase, {
        userId: user.id,
        limit: 5000,
        mineOnly,
      });
      initialPosts = feed.posts;
      hasServerFeed = true;
    } catch {
      // RLS or network: show empty feed; client will refetch
    }

    return (
      <DashboardClient
        initialPosts={initialPosts as import("@/lib/types/database").Post[]}
        initialUser={{ id: user.id, email: user.email ?? undefined }}
        hasServerFeed={hasServerFeed}
      />
    );
  } catch (err) {
    // Supabase client, auth, or env failure — rethrow so error.tsx can show friendly UI
    throw err;
  }
}
