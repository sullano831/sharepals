## FileFiesta — Deployment Guide

### Prerequisites
- Node.js 18+
- A Supabase account (supabase.com)
- A Vercel account (vercel.com)
- A GitHub account

---

## Step 1: Bootstrap the Next.js App

```bash
npx create-next-app@latest filefiesta \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd filefiesta

# Install dependencies
npm install \
  @supabase/supabase-js \
  @supabase/auth-helpers-nextjs \
  date-fns \
  lucide-react

# Install dev dependencies
npm install -D @types/node
```

---

## Step 2: Supabase Project Setup

1. Go to https://supabase.com → New Project
2. Save your **Project URL** and **anon key** (Settings → API)
3. Also save your **service_role key** (keep this secret)

### 2a. Run the Schema

In Supabase Dashboard → SQL Editor → New Query:

```
Paste and run: schema.sql
```

### 2b. Create Storage Buckets

Dashboard → Storage → New bucket:

| Bucket Name  | Public | File size limit |
|-------------|--------|-----------------|
| `post-files` | ❌ No  | 50 MB           |
| `avatars`    | ✅ Yes | 5 MB            |

### 2c. Apply Storage Policies

SQL Editor → run: `storage-policies.sql`

### 2d. Configure Auth

Dashboard → Auth → URL Configuration:
- Site URL: `http://localhost:3000` (dev) or your Vercel URL (prod)
- Redirect URLs: add `https://your-app.vercel.app/**`

---

## Step 3: Environment Variables

Create `.env.local` in your project root:

```bash
# Supabase (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-only — NEVER expose to browser
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: for link preview scraping
LINK_PREVIEW_API_KEY=your_key_here
```

---

## Step 4: Generate TypeScript Types

```bash
npx supabase login
npx supabase gen types typescript \
  --project-id your-project-id \
  --schema public \
  > lib/types/supabase.ts
```

---

## Step 5: Local Development

```bash
npm run dev
# → http://localhost:3000
```

---

## Step 6: Deploy to Vercel

### Option A: Via Vercel CLI

```bash
npm install -g vercel
vercel
# Follow prompts
```

### Option B: Via GitHub

1. Push code to GitHub
2. Go to https://vercel.com → Import Project
3. Select your repo
4. **Add Environment Variables** (all three from .env.local)
5. Framework Preset: Next.js
6. Click Deploy

### After deployment:
- Copy your Vercel URL (e.g., `https://filefiesta.vercel.app`)
- Add it to Supabase Auth → URL Configuration → Redirect URLs

---

## Step 7: Supabase CLI (Optional but Recommended)

```bash
npm install -g supabase

# Initialize (links to your hosted project)
supabase init
supabase link --project-ref your-project-id

# Pull remote schema into local migrations
supabase db pull

# Push local changes to remote
supabase db push
```

---

## Folder Structure Reference

```
filefiesta/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Home (public feed)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   └── page.tsx                # Protected vault
│   ├── profile/
│   │   └── [username]/page.tsx
│   └── api/
│       ├── posts/
│       │   ├── route.ts            # GET feed, POST create
│       │   ├── mine/route.ts       # GET own posts
│       │   └── [id]/
│       │       ├── route.ts        # GET, PATCH, DELETE
│       │       └── access/
│       │           ├── route.ts    # POST grant access
│       │           └── [uid]/route.ts # DELETE revoke
│       ├── upload/route.ts
│       └── users/
│           └── search/route.ts
├── components/
│   ├── feed/
│   │   ├── Feed.tsx
│   │   ├── PostCard.tsx
│   │   └── PostList.tsx
│   ├── forms/
│   │   ├── PostForm.tsx
│   │   ├── VisibilitySelector.tsx
│   │   └── FileUpload.tsx
│   ├── dashboard/
│   │   └── Dashboard.tsx
│   ├── profile/
│   │   ├── ProfileHeader.tsx
│   │   └── ProfilePosts.tsx
│   └── ui/
│       ├── Navbar.tsx
│       ├── Avatar.tsx
│       └── Modal.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePosts.ts
│   │   └── useUpload.ts
│   ├── queries/
│   │   └── index.ts
│   └── types/
│       ├── database.ts
│       └── supabase.ts             # auto-generated
├── middleware.ts
├── .env.local
├── .env.example
├── next.config.js
└── tailwind.config.ts
```

---

## Scalability Recommendations

### Database

```sql
-- Full-text search (already in schema.sql)
CREATE INDEX idx_posts_content_fts
  ON public.posts USING GIN(to_tsvector('english', coalesce(content, '')));

-- Partial index for public feed (most common query)
CREATE INDEX idx_posts_public_feed
  ON public.posts(created_at DESC)
  WHERE visibility = 'public';

-- When posts table exceeds ~10M rows: partition by month
CREATE TABLE posts_2025_01 PARTITION OF posts
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Caching Strategy

```typescript
// Use Next.js fetch cache for public feed (revalidate every 60s)
const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/posts`, {
  next: { revalidate: 60 }
})

// Use Upstash Redis for hot data
import { Redis } from '@upstash/redis'
const redis = new Redis({ url: process.env.UPSTASH_URL!, token: process.env.UPSTASH_TOKEN! })
const cached = await redis.get<Post[]>('public_feed_page_1')
```

### Rate Limiting

```typescript
// Install: npm install @upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1m'), // 10 requests/min
})

// In API route:
const { success } = await ratelimit.limit(req.ip ?? 'anonymous')
if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
```

### Phase 2 Feature Additions

| Feature | Tables to add |
|---------|---------------|
| Likes | `post_likes(post_id, user_id, created_at)` |
| Comments | `comments(id, post_id, user_id, content, created_at)` |
| Follows | `follows(follower_id, following_id, created_at)` |
| Notifications | `notifications(id, user_id, type, payload, read, created_at)` |
| Collections | `collections(id, user_id, name)` + `collection_posts(collection_id, post_id)` |
| Tags | `tags(id, name)` + `post_tags(post_id, tag_id)` |

### Realtime (Supabase)

```typescript
// Subscribe to new public posts
const channel = supabase
  .channel('public-feed')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts',
    filter: 'visibility=eq.public'
  }, (payload) => {
    setPosts(prev => [payload.new as Post, ...prev])
  })
  .subscribe()

return () => supabase.removeChannel(channel)
```
