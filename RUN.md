# How to Run SharePals Locally & Deploy to Vercel

**What SharePals does:** A simple shared space for registered users. You sign up, sign in, then upload files (with an optional caption) and share them with **everyone who is registered**. The dashboard shows a feed of all shared uploads. No public/private/custom options — just “share with everyone registered.”

## Run locally

### 1. Install dependencies

```bash
cd SharePals
npm install
```

### 2. Set up Supabase (2 SQL files only)

1. Create a project at [supabase.com](https://supabase.com) → New Project.
2. In **SQL Editor**, run **`schema.sql`** once. It creates all tables (profiles, posts, post_files, follows, notifications, etc.) and all RLS policies so the feed, post files, buddies, and notifications work.
3. In **Storage**, create two buckets:
   - `post-files` — **Private**, file size limit 100 MB
   - `avatars` — **Public**, file size limit 5 MB
4. In **SQL Editor**, run **`storage-policies.sql`** (so uploads and signed URLs work).
5. **If you already had an older setup** and the feed or post files are empty, run **`schema.sql`** again; it’s safe (uses `IF NOT EXISTS` / `DROP POLICY IF EXISTS`) and will fix all policies.
6. In **Auth → URL Configuration**:
   - Site URL: `http://localhost:3001`
   - Redirect URLs: `http://localhost:3001/**`

### 3. Environment variables (easy guide)

You need three values from Supabase. Then you put them in a file named `.env.local` in the SharePals folder.

---

**Step A — Get the three keys from Supabase**

1. Open your project at [supabase.com](https://supabase.com) and go to your SharePals project.
2. In the left sidebar, click **Project Settings** (gear icon at the bottom).
3. Click **API** in the left menu.
4. On the API page you’ll see:
   - **Project URL** — copy this (e.g. `https://abcdefgh.supabase.co`).
   - **Project API keys**:
     - **anon** **public** — click “Reveal” if needed, then copy.
     - **service_role** — click “Reveal”, then copy.  
     ⚠️ **Never share or commit the service_role key** — it bypasses security.

---

**Step B — Create `.env.local` in SharePals**

**Option 1 — Using the terminal (PowerShell)**

1. Open a terminal in the SharePals folder (e.g. `D:\Angel\2026\PORTY\SharePals`).
2. Run:
   ```powershell
   Copy-Item .env.example .env.local
   ```
   (On Mac/Linux you’d use: `cp .env.example .env.local`.)

**Option 2 — Manual**

1. In the SharePals folder, find the file `.env.example`.
2. Copy it and paste it in the same folder.
3. Rename the copy to `.env.local` (no `.example` in the name).

---

**Step C — Put your keys into `.env.local`**

1. Open `.env.local` in your editor (e.g. Cursor / VS Code).
2. Replace the placeholder values with your real values:

   - **NEXT_PUBLIC_SUPABASE_URL**  
     Paste the **Project URL** you copied (the `https://….supabase.co` link).

   - **NEXT_PUBLIC_SUPABASE_ANON_KEY**  
     Paste the **anon public** key (long string starting with `eyJ…`).

   - **SUPABASE_SERVICE_ROLE_KEY**  
     Paste the **service_role** key (another long `eyJ…` string).

3. Save the file.

Example of how it should look (with fake values):

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
```

4. **Do not commit `.env.local`** to Git — it’s already in `.gitignore`.

---

**Note:** `npm run build` needs these variables set. On Vercel, add the same three names and values in **Project Settings → Environment Variables**.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up or sign in, then go to **Dashboard** to upload files and see everyone’s shared uploads.

### 5. Test the API (Postman or Thunder Client)

You can call the app’s APIs from a REST client. Use one of these:

| Tool | Where to get it |
|------|------------------|
| **Thunder Client** | Inside Cursor/VS Code: **Extensions** (`Ctrl+Shift+X`) → search **Thunder Client** → Install. Then open the Thunder Client icon in the left sidebar. |
| **Postman** | [postman.com/downloads](https://www.postman.com/downloads/) — download for Windows and install (free). |

**Base URL when the app is running:** `http://localhost:3000`

**Examples:**

- **Public feed (no login):**  
  `GET` `http://localhost:3000/api/posts`
- **Your posts / create post / upload:**  
  These need you to be signed in. The app uses cookies for auth.

**How to send your login (cookie) in the tool:**

1. In the browser, go to [http://localhost:3000](http://localhost:3000) and **Sign in**.
2. Press **F12** → open **Application** (Chrome) or **Storage** (Firefox) → **Cookies** → `http://localhost:3000`.
3. Find the Supabase auth cookie (name like `sb-xxxxxxxx-auth-token`). Copy its **Value**.
4. In Thunder Client or Postman, for requests to `http://localhost:3000`:
   - Add a header: **Cookie** = `sb-xxxxxxxx-auth-token=<paste the value here>`  
   (Use your real cookie name and value.)

**Quick test requests:**

| What | Method | URL | Body (if needed) |
|------|--------|-----|-------------------|
| Public feed | GET | `http://localhost:3000/api/posts` | — |
| Your posts | GET | `http://localhost:3000/api/posts/mine` | Cookie header (see above) |
| Create post | POST | `http://localhost:3000/api/posts` | Raw JSON: `{"content":"Hello world","visibility":"public"}` + Cookie header |
| Upload file | POST | `http://localhost:3000/api/upload` | Body: **form-data**, key `file`, choose a file + Cookie header |

---

## Deploy to Vercel (live system)

### Option A: Deploy with Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked for environment variables, add the same three from `.env.local`.

### Option B: Deploy via GitHub (recommended)

1. Push this project to a GitHub repo (from the repo root or from `FileFiesta` as the root).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
3. Import the repository. Set **Root Directory** to `FileFiesta` if the app is inside that folder.
4. **Environment Variables**: add these (same as `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. **Framework Preset**: Next.js (auto-detected).
6. Click **Deploy**.

### After deployment

1. Copy your Vercel URL (e.g. `https://filefiesta.vercel.app`).
2. In **Supabase → Auth → URL Configuration**:
   - Set **Site URL** to your Vercel URL.
   - Add to **Redirect URLs**: `https://your-app.vercel.app/**`

The system is now live on Vercel with Supabase auth and storage.

---

## Build check (before deploy)

```bash
npm run build
```

If this succeeds, the app is ready for Vercel. Vercel runs `npm run build` and then serves the app with `next start`.
