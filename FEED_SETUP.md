# Fix: Posts not showing on dashboard after refresh

If the dashboard shows **"Couldn't load the feed"** or an empty feed after you post or refresh, do this once in your Supabase project.

## 1. Run the RLS fix in Supabase

The feed is filtered by **Row Level Security (RLS)**. If the policy is missing or wrong, no posts are returned.

1. Open your **Supabase** project in the browser.
2. Go to **SQL Editor** → **New query**.
3. Open the file **`supabase-fix-posts-visible.sql`** in this repo, copy its full contents, and paste into the editor.
4. Click **Run**. You should see success (no errors).

That script:

- Enables RLS on `posts` and `post_files`
- Allows you to see: **your own posts**, **public** posts, **members** posts when logged in, and **custom** posts you’re allowed to see

## 2. Check the error message on the dashboard

After the code changes in this project, the dashboard shows the **real error** when the feed fails (e.g. *"Sign in to see shared files"* or a Supabase message). Use that to debug:

- **"Sign in to see shared files"** → Session missing or expired. Sign out and sign in again.
- **Permission / RLS message** → Run the SQL from step 1 (or fix the policy it mentions).
- **Relation / column errors** → The app now falls back to loading posts without profile join; if you still see this, check your Supabase table names and columns.

## 3. Environment variables

Ensure `.env.local` (or your env) has:

- `NEXT_PUBLIC_SUPABASE_URL` = your project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon/public key  

Restart the dev server after changing env.

---

After step 1, reload the dashboard; your posts should load and stay visible after refresh.
