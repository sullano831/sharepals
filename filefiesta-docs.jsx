import { useState } from "react";

const SECTIONS = [
  { id: "overview", icon: "🗺️", label: "Overview" },
  { id: "schema", icon: "🗄️", label: "DB Schema" },
  { id: "rls", icon: "🔐", label: "RLS Policies" },
  { id: "storage", icon: "📦", label: "Storage" },
  { id: "api", icon: "⚡", label: "API Routes" },
  { id: "queries", icon: "🔍", label: "Queries" },
  { id: "components", icon: "⚛️", label: "Components" },
  { id: "auth", icon: "🔑", label: "Auth Flow" },
  { id: "folders", icon: "📁", label: "Folder Structure" },
  { id: "deploy", icon: "🚀", label: "Deployment" },
  { id: "scale", icon: "📈", label: "Scalability" },
];

function Code({ children, lang = "" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-700">
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-800 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-mono">{lang}</span>
        <button
          onClick={copy}
          className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-0.5 rounded"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="bg-slate-900 p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-slate-200 font-mono whitespace-pre">{children}</code>
      </pre>
    </div>
  );
}

function Badge({ color, children }) {
  const colors = {
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    red: "bg-red-500/20 text-red-300 border-red-500/30",
    gray: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto my-4 rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800 border-b border-slate-700">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-3 text-slate-300 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-slate-700/50 ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-800/50"}`}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-slate-300 align-top">
                  <span className="font-mono text-xs">{cell}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function H2({ children }) {
  return <h2 className="text-xl font-bold text-white mt-8 mb-3 flex items-center gap-2">{children}</h2>;
}
function H3({ children }) {
  return <h3 className="text-base font-semibold text-blue-300 mt-6 mb-2">{children}</h3>;
}
function P({ children }) {
  return <p className="text-slate-400 text-sm leading-relaxed mb-3">{children}</p>;
}
function Note({ children }) {
  return (
    <div className="my-4 flex gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
      <span className="text-blue-400 flex-shrink-0">ℹ️</span>
      <p className="text-blue-300 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
function Warn({ children }) {
  return (
    <div className="my-4 flex gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <span className="flex-shrink-0">⚠️</span>
      <p className="text-amber-300 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

// ── Section content ────────────────────────────────────────
function OverviewSection() {
  return (
    <div>
      <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20">
        <h1 className="text-3xl font-black text-white mb-2">🎉 FileFiesta</h1>
        <p className="text-slate-300 text-lg">Production-ready architecture for a Twitter-like file sharing platform</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {["Next.js 14","Supabase","PostgreSQL","TypeScript","Tailwind CSS","Vercel"].map(t => (
            <Badge key={t} color="blue">{t}</Badge>
          ))}
        </div>
      </div>

      <H2>Core Features</H2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
        {[
          { icon: "👤", title: "Multi-user Auth", desc: "Email/password via Supabase Auth. Sessions via HttpOnly cookies. Auto profile creation on signup." },
          { icon: "📝", title: "Rich Post System", desc: "Posts support text, file attachments (PDF, DOCX, images, video), and external link previews." },
          { icon: "🔒", title: "3-Tier Visibility", desc: "Public (global feed), Private (vault only), Custom (selected users via join table)." },
          { icon: "🛡️", title: "Row Level Security", desc: "RLS enforced at DB layer. Private posts invisible even via direct SQL. Storage policies mirror post rules." },
          { icon: "📁", title: "Private Vault", desc: "Dashboard view of all own posts. Filter by visibility. Manage file attachments with signed URLs." },
          { icon: "📈", title: "Scalable by Design", desc: "Cursor pagination, partial indexes, Redis caching layer, rate limiting. Ready for 1M+ posts." },
        ].map(f => (
          <div key={f.title} className="p-4 bg-slate-800 border border-slate-700 rounded-xl">
            <div className="text-2xl mb-2">{f.icon}</div>
            <p className="font-semibold text-white text-sm">{f.title}</p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <H2>Architecture Diagram</H2>
      <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 font-mono text-xs text-slate-300 leading-loose">
        <pre>{`Browser (Next.js)
    │
    ├── /                    → Public Feed (SSR)
    ├── /dashboard           → Private Vault (Protected, Client)
    ├── /profile/:username   → User Profile (SSR)
    ├── /login               → Auth Page
    │
    ↓  Next.js API Routes (app/api/)
    │
    ├── POST   /api/posts          → Create post + grant custom access
    ├── GET    /api/posts          → Public feed (cursor-paginated)
    ├── GET    /api/posts/mine     → Dashboard posts (all visibilities)
    ├── PATCH  /api/posts/:id      → Edit post (owner only)
    ├── DELETE /api/posts/:id      → Delete post + file (owner only)
    ├── POST   /api/upload         → Upload to Supabase Storage
    │
    ↓  Supabase (hosted Postgres + Auth + Storage)
    │
    ├── auth.users                 → Supabase Auth
    ├── public.profiles            → User profiles
    ├── public.posts               → Core posts table (RLS enabled)
    ├── public.post_allowed_users  → Custom visibility grants (RLS enabled)
    │
    └── Storage
        ├── post-files (private)   → Served via signed URLs (1hr TTL)
        └── avatars (public)       → Direct CDN URLs`}</pre>
      </div>
    </div>
  );
}

function SchemaSection() {
  return (
    <div>
      <P>Three tables form the core. All have RLS enabled. Triggers auto-create profiles on signup and update <code className="text-blue-300">updated_at</code> on every write.</P>

      <H2>profiles</H2>
      <P>Extends Supabase's built-in auth.users. Created automatically via trigger on signup.</P>
      <Table
        headers={["Column", "Type", "Constraints", "Notes"]}
        rows={[
          ["id", "uuid", "PK, FK → auth.users", "Mirrors auth user ID"],
          ["username", "text", "UNIQUE NOT NULL", "Public @handle"],
          ["display_name", "text", "NOT NULL", "Full display name"],
          ["avatar_url", "text", "NULL", "Storage path"],
          ["bio", "text", "NULL", "Short bio"],
          ["created_at", "timestamptz", "DEFAULT now()", ""],
          ["updated_at", "timestamptz", "DEFAULT now()", "Auto-updated via trigger"],
        ]}
      />

      <H2>posts</H2>
      <P>Core content entity. The visibility column drives all access control logic.</P>
      <Table
        headers={["Column", "Type", "Constraints", "Notes"]}
        rows={[
          ["id", "uuid", "PK DEFAULT gen_random_uuid()", ""],
          ["user_id", "uuid", "FK → profiles.id CASCADE", "Author"],
          ["content", "text", "NULL", "Post body text"],
          ["file_url", "text", "NULL", "Storage path (not a public URL)"],
          ["file_name", "text", "NULL", "Original filename for display"],
          ["file_type", "text", "NULL", "MIME type"],
          ["file_size", "bigint", "NULL", "Bytes"],
          ["external_link", "text", "NULL", "External URL"],
          ["link_title", "text", "NULL", "OG title"],
          ["link_description", "text", "NULL", "OG description"],
          ["link_image", "text", "NULL", "OG image URL"],
          ["visibility", "text", "CHECK IN ('public','private','custom')", "Access level"],
          ["created_at / updated_at", "timestamptz", "DEFAULT now()", ""],
        ]}
      />
      <Note>At least one of content, file_url, or external_link must be present — enforced via CHECK constraint.</Note>

      <H2>post_allowed_users</H2>
      <P>Join table for custom-visibility posts. The post owner defines who can access each post.</P>
      <Table
        headers={["Column", "Type", "Constraints", "Notes"]}
        rows={[
          ["id", "uuid", "PK", ""],
          ["post_id", "uuid", "FK → posts.id CASCADE", "Cascades on post delete"],
          ["user_id", "uuid", "FK → profiles.id CASCADE", "Granted user"],
          ["granted_by", "uuid", "FK → profiles.id", "Must be post owner"],
          ["created_at", "timestamptz", "DEFAULT now()", ""],
          ["UNIQUE", "(post_id, user_id)", "", "Prevent duplicate grants"],
        ]}
      />

      <H2>Key Indexes</H2>
      <Code lang="sql">{`-- Public feed (most-read path)
CREATE INDEX idx_posts_public_feed
  ON public.posts(created_at DESC)
  WHERE visibility = 'public';

-- User dashboard
CREATE INDEX idx_posts_user_id ON public.posts(user_id);

-- Custom access lookup
CREATE INDEX idx_pau_user_id ON public.post_allowed_users(user_id);

-- Full-text search
CREATE INDEX idx_posts_content_fts
  ON public.posts USING GIN(to_tsvector('english', coalesce(content, '')));`}</Code>
    </div>
  );
}

function RLSSection() {
  return (
    <div>
      <Note>RLS policies run inside PostgreSQL itself. No matter what API call is made — even a direct REST call to the Supabase endpoint — the database silently filters rows based on auth.uid(). There is no way to bypass this from the application layer.</Note>

      <H2>profiles Policies</H2>
      <Code lang="sql">{`-- Anyone can read profiles (public)
CREATE POLICY "profiles: public read"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);`}</Code>

      <H2>posts SELECT Policy</H2>
      <P>This single policy handles all three visibility levels:</P>
      <Code lang="sql">{`CREATE POLICY "posts: select"
  ON public.posts FOR SELECT
  USING (
    -- Condition 1: Public posts — everyone sees them
    visibility = 'public'

    -- Condition 2: Own posts — always visible to owner
    OR user_id = auth.uid()

    -- Condition 3: Custom posts — visible if user is in the access list
    OR (
      visibility = 'custom'
      AND EXISTS (
        SELECT 1 FROM public.post_allowed_users pau
        WHERE pau.post_id = posts.id
          AND pau.user_id = auth.uid()
      )
    )
    -- NOTE: 'private' posts only match condition 2 (owner only)
  );`}</Code>

      <H2>posts Write Policies</H2>
      <Code lang="sql">{`-- INSERT: authenticated users, user_id must match caller
CREATE POLICY "posts: insert"
  ON public.posts FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  );

-- UPDATE: owners only
CREATE POLICY "posts: update"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: owners only
CREATE POLICY "posts: delete"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);`}</Code>

      <H2>post_allowed_users Policies</H2>
      <Code lang="sql">{`-- SELECT: post owner or granted user
CREATE POLICY "pau: select"
  ON public.post_allowed_users FOR SELECT
  USING (granted_by = auth.uid() OR user_id = auth.uid());

-- INSERT: only the post owner can grant access
CREATE POLICY "pau: insert"
  ON public.post_allowed_users FOR INSERT
  WITH CHECK (
    granted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

-- DELETE: only the post owner can revoke access
CREATE POLICY "pau: delete"
  ON public.post_allowed_users FOR DELETE
  USING (granted_by = auth.uid());`}</Code>

      <H2>Visibility Matrix</H2>
      <Table
        headers={["Post Visibility", "Owner", "Granted User", "Other Auth User", "Anonymous"]}
        rows={[
          ["public",  "✅ Read/Write", "✅ Read", "✅ Read", "✅ Read"],
          ["private", "✅ Read/Write", "❌ No",   "❌ No",  "❌ No"],
          ["custom",  "✅ Read/Write", "✅ Read", "❌ No",  "❌ No"],
        ]}
      />
    </div>
  );
}

function StorageSection() {
  return (
    <div>
      <H2>Bucket Configuration</H2>
      <Table
        headers={["Bucket", "Public?", "Max Size", "Path Pattern", "Served Via"]}
        rows={[
          ["post-files", "❌ Private", "50 MB", "{userId}/{postId}/{filename}", "Signed URLs (1hr TTL)"],
          ["avatars",    "✅ Public",  "5 MB",  "{userId}/avatar.{ext}",        "Direct CDN URL"],
        ]}
      />

      <Warn>Never store signed URLs in the database. Always generate them on-the-fly server-side. Signed URLs expire and must be regenerated for each request.</Warn>

      <H2>post-files Storage Policies</H2>
      <Code lang="sql">{`-- INSERT: users can only write to their own folder
CREATE POLICY "post-files: owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- SELECT: mirrors the post access control
CREATE POLICY "post-files: conditional read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'post-files' AND (
      -- Owner always has access
      auth.uid()::text = (storage.foldername(name))[1]
      -- Or it belongs to a public post
      OR EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.file_url LIKE '%' || name
          AND p.visibility = 'public'
      )
      -- Or it belongs to a custom post they can access
      OR EXISTS (
        SELECT 1 FROM public.posts p
        JOIN public.post_allowed_users pau ON pau.post_id = p.id
        WHERE p.file_url LIKE '%' || name
          AND p.visibility = 'custom'
          AND pau.user_id = auth.uid()
      )
    )
  );`}</Code>

      <H2>Generating Signed URLs (Server-side)</H2>
      <Code lang="typescript">{`// Always done server-side in an API route
async function getSignedFileUrl(filePath: string) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data, error } = await supabase.storage
    .from('post-files')
    .createSignedUrl(
      filePath,
      3600 // 1 hour TTL — adjust based on your needs
    )

  if (error) throw error
  return data.signedUrl
}

// Example: generate URLs for all posts in a batch
const postsWithUrls = await Promise.all(
  posts.map(async (post) => {
    if (!post.file_url) return post
    const signed_url = await getSignedFileUrl(post.file_url)
    return { ...post, signed_url }
  })
)`}</Code>

      <H2>File Upload Flow</H2>
      <Code lang="typescript">{`// In the upload API route (app/api/upload/route.ts)
const formData = await req.formData()
const file = formData.get('file') as File

// Sanitize filename (prevent path traversal)
const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
const postId = crypto.randomUUID()
const path = \`\${user.id}/\${postId}/\${safeFilename}\`

// Upload — Storage RLS validates user.id matches folder
await supabase.storage
  .from('post-files')
  .upload(path, file, { contentType: file.type, upsert: false })

// Return path (not URL) to store in posts.file_url
return { path, name: file.name, type: file.type, size: file.size }`}</Code>
    </div>
  );
}

function APISection() {
  return (
    <div>
      <H2>Route Map</H2>
      <Table
        headers={["Method", "Route", "Auth", "Description"]}
        rows={[
          ["GET",    "/api/posts",                   "No",         "Cursor-paginated public feed"],
          ["POST",   "/api/posts",                   "Required",   "Create post (+ grant custom access)"],
          ["GET",    "/api/posts/[id]",               "Optional",   "Single post with signed URL"],
          ["PATCH",  "/api/posts/[id]",               "Owner only", "Edit post content/visibility"],
          ["DELETE", "/api/posts/[id]",               "Owner only", "Delete post + file from storage"],
          ["GET",    "/api/posts/mine",               "Required",   "Current user's posts (all vis.)"],
          ["POST",   "/api/posts/[id]/access",        "Owner only", "Grant custom access to users"],
          ["DELETE", "/api/posts/[id]/access/[uid]",  "Owner only", "Revoke custom access"],
          ["GET",    "/api/profile/[username]",        "No",         "Public profile + posts"],
          ["PATCH",  "/api/profile",                  "Required",   "Update current user profile"],
          ["POST",   "/api/upload",                   "Required",   "Upload file → returns storage path"],
          ["GET",    "/api/users/search?q=",          "Required",   "Search users for custom picker"],
        ]}
      />

      <H2>Create Post — Full Example</H2>
      <Code lang="typescript">{`// app/api/posts/route.ts
export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { allowed_user_ids, ...postData } = body

  // Validate at least one content field
  if (!postData.content && !postData.file_url && !postData.external_link) {
    return NextResponse.json(
      { error: 'Post must have content, a file, or a link' },
      { status: 400 }
    )
  }

  // Insert post — RLS WITH CHECK ensures user_id matches
  const { data: post, error } = await supabase
    .from('posts')
    .insert({ ...postData, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If custom visibility, insert access grants (transactional pattern)
  if (postData.visibility === 'custom' && allowed_user_ids?.length) {
    const grants = allowed_user_ids.map(uid => ({
      post_id: post.id,
      user_id: uid,
      granted_by: user.id,
    }))
    const { error: grantError } = await supabase
      .from('post_allowed_users')
      .insert(grants)

    if (grantError) {
      // Roll back post if grants fail
      await supabase.from('posts').delete().eq('id', post.id)
      return NextResponse.json({ error: grantError.message }, { status: 500 })
    }
  }

  return NextResponse.json(post, { status: 201 })
}`}</Code>

      <H2>Delete Post (with storage cleanup)</H2>
      <Code lang="typescript">{`export async function DELETE(req, { params }) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch first to get the file path
  const { data: post } = await supabase
    .from('posts')
    .select('file_url, user_id')
    .eq('id', params.id)
    .single()

  if (post?.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete from storage BEFORE deleting the DB row
  if (post.file_url) {
    await supabase.storage.from('post-files').remove([post.file_url])
  }

  // RLS policy prevents deletion if user isn't owner
  // CASCADE on post_allowed_users handles the join table cleanup
  await supabase.from('posts').delete().eq('id', params.id)

  return new NextResponse(null, { status: 204 })
}`}</Code>
    </div>
  );
}

function QueriesSection() {
  return (
    <div>
      <H2>1. Public Feed (cursor-paginated)</H2>
      <Code lang="typescript">{`async function getPublicFeed(cursor?: string, limit = 20) {
  let query = supabase
    .from('posts')
    .select(\`
      id, content, file_url, file_name, file_type,
      external_link, link_title, link_description, link_image,
      visibility, created_at,
      profiles ( id, username, display_name, avatar_url )
    \`)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit + 1)           // fetch +1 to detect hasMore

  if (cursor) {
    query = query.lt('created_at', cursor)   // cursor-based pagination
  }

  const { data } = await query
  const hasMore = data.length > limit
  return {
    posts: hasMore ? data.slice(0, limit) : data,
    nextCursor: hasMore ? data[limit - 1].created_at : null,
    hasMore,
  }
}`}</Code>

      <H2>2. Private Dashboard Query</H2>
      <Code lang="typescript">{`// RLS SELECT policy already filters to owner-only for private/custom
// so simply querying by user_id returns all their posts
async function getMyDashboard(userId: string, visibility?: string) {
  let query = supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (visibility) {
    query = query.eq('visibility', visibility)
  }

  const { data, error } = await query
  return data
}`}</Code>

      <H2>3. Custom Visibility Query (with join)</H2>
      <Code lang="typescript">{`// Option A: Let RLS handle it implicitly
// The posts SELECT policy checks post_allowed_users automatically
const { data } = await supabase
  .from('posts')
  .select('*, profiles(*)')
  .eq('visibility', 'custom')
  .neq('user_id', currentUserId)      // exclude own posts

// Option B: Explicit join through post_allowed_users
const { data } = await supabase
  .from('post_allowed_users')
  .select(\`
    post_id,
    posts (
      id, content, file_url, visibility, created_at,
      profiles ( id, username, display_name, avatar_url )
    )
  \`)
  .eq('user_id', currentUserId)
  .order('created_at', { ascending: false, foreignTable: 'posts' })`}</Code>

      <H2>4. Full-Text Search</H2>
      <Code lang="typescript">{`const { data } = await supabase
  .from('posts')
  .select('id, content, created_at, profiles(username, display_name)')
  .eq('visibility', 'public')
  .textSearch('content', query, {
    type: 'websearch',   // supports AND, OR, "phrases", -negation
    config: 'english',
  })
  .order('created_at', { ascending: false })
  .limit(20)`}</Code>

      <H2>5. Grant / Revoke Custom Access</H2>
      <Code lang="typescript">{`// Grant access to multiple users at once
async function grantAccess(postId: string, userIds: string[], granterId: string) {
  await supabase
    .from('post_allowed_users')
    .upsert(
      userIds.map(uid => ({ post_id: postId, user_id: uid, granted_by: granterId })),
      { onConflict: 'post_id,user_id' }  // idempotent
    )
}

// Revoke one user
async function revokeAccess(postId: string, userId: string) {
  await supabase
    .from('post_allowed_users')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)
}`}</Code>
    </div>
  );
}

function ComponentsSection() {
  return (
    <div>
      <H2>Component Tree</H2>
      <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 font-mono text-xs text-slate-300 leading-loose my-4">
        <pre>{`app/
├── page.tsx          → <Feed />
├── dashboard/        → <Dashboard />
└── profile/[u]/      → <ProfileHeader /> + <ProfilePosts />

components/
├── feed/
│   ├── Feed.tsx           — Cursor-paginated list of PostCards
│   └── PostCard.tsx       — Renders text/file/link, owner actions
├── forms/
│   ├── PostForm.tsx       — Create + Edit form (shared)
│   ├── FileUpload.tsx     — Drag-and-drop zone
│   └── VisibilitySelector.tsx — Public/Private/Custom + user search
├── dashboard/
│   └── Dashboard.tsx      — Private vault with filter tabs + stats
└── ui/
    ├── Navbar.tsx
    └── Avatar.tsx`}</pre>
      </div>

      <H2>VisibilitySelector</H2>
      <P>Handles all three visibility levels. When "Custom" is selected, shows a user search input and chip list of selected users.</P>
      <Code lang="tsx">{`<VisibilitySelector
  value={visibility}          // 'public' | 'private' | 'custom'
  onChange={setVisibility}
  onUsersChange={setUserIds}  // called with array of user IDs
  selectedUsers={users}       // { id, username, display_name }[]
/>`}</Code>

      <H2>PostForm</H2>
      <P>Shared between "create new post" and "edit existing post". Handles file upload, external link, and custom access management.</P>
      <Code lang="tsx">{`// Create mode
<PostForm onSuccess={() => refetchFeed()} />

// Edit mode — pre-populates all fields
<PostForm
  editPost={post}        // existing Post object
  onSuccess={() => {
    setEditing(false)
    refetchPost()
  }}
/>`}</Code>

      <H2>PostCard</H2>
      <P>Renders any combination of content, file attachment, and external link. Adapts for owner vs. viewer context.</P>
      <Code lang="tsx">{`<PostCard
  post={post}           // Post with profiles joined + signed_url
  isOwner={post.user_id === currentUserId}
  onDelete={(id) => removeFromList(id)}
  onRefresh={() => refetchPosts()}
/>`}</Code>

      <H2>Dashboard</H2>
      <P>Protected route. Shows stats (total/public/private/custom), PostForm at top, filter tabs, and list of own posts with edit/delete actions.</P>
      <Code lang="tsx">{`// app/dashboard/page.tsx
import { Dashboard } from '@/components/dashboard/Dashboard'

export default function DashboardPage() {
  return <Dashboard />
  // Protected by middleware.ts — redirects to /login if no session
}`}</Code>
    </div>
  );
}

function AuthSection() {
  return (
    <div>
      <H2>Auth Flow Overview</H2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {[
          { step: "1", title: "Registration", items: ["User submits email + password at /register", "supabase.auth.signUp() creates row in auth.users", "on_auth_user_created trigger fires, inserting into public.profiles with username derived from email", "User is auto-signed in, redirected to /dashboard"] },
          { step: "2", title: "Login", items: ["supabase.auth.signInWithPassword()", "Returns JWT + refresh token", "Auth Helpers store in HttpOnly cookies (not localStorage)", "Middleware reads cookies to protect routes"] },
          { step: "3", title: "Session Refresh", items: ["Auth Helpers middleware auto-refreshes JWT before expiry", "Default JWT TTL: 1 hour, refresh token: 7 days", "No manual refresh code needed in components", "createMiddlewareClient() handles everything"] },
          { step: "4", title: "Sign Out", items: ["supabase.auth.signOut() called client-side", "Clears session cookies", "Redirect to / or /login", "RLS automatically blocks any further queries"] },
        ].map(s => (
          <div key={s.step} className="p-4 bg-slate-800 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">{s.step}</div>
              <h3 className="font-semibold text-white">{s.title}</h3>
            </div>
            <ul className="space-y-1">
              {s.items.map((item, i) => (
                <li key={i} className="text-slate-400 text-xs flex gap-2">
                  <span className="text-blue-400 flex-shrink-0">→</span>{item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <H2>Middleware Guard</H2>
      <Code lang="typescript">{`// middleware.ts (project root)
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // CRITICAL: Always call getSession — this refreshes the JWT cookie
  const { data: { session } } = await supabase.auth.getSession()

  const isProtected = ['/dashboard', '/profile/edit']
    .some(path => req.nextUrl.pathname.startsWith(path))

  if (isProtected && !session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return res  // Must return res to propagate refreshed cookie
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}`}</Code>

      <H2>Server-side Auth in API Routes</H2>
      <Code lang="typescript">{`// In every protected API route:
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  // getUser() verifies the JWT cryptographically (more secure than getSession)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user || error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // user.id is now verified and can be trusted
  // RLS will also enforce this at the DB level as a second layer
}`}</Code>
    </div>
  );
}

function FoldersSection() {
  return (
    <div>
      <H2>Complete Folder Structure</H2>
      <Code lang="bash">{`filefiesta/
├── app/
│   ├── layout.tsx                 # Root layout (Navbar, AuthProvider)
│   ├── page.tsx                   # Home — public feed
│   ├── (auth)/                    # Route group (no layout impact)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   └── page.tsx               # Protected — private vault
│   ├── profile/
│   │   ├── [username]/page.tsx    # Public profile page
│   │   └── edit/page.tsx          # Protected — edit own profile
│   └── api/
│       ├── posts/
│       │   ├── route.ts           # GET (feed), POST (create)
│       │   ├── mine/route.ts      # GET own posts (all vis.)
│       │   └── [id]/
│       │       ├── route.ts       # GET, PATCH, DELETE
│       │       └── access/
│       │           ├── route.ts           # POST (grant)
│       │           └── [userId]/route.ts  # DELETE (revoke)
│       ├── upload/route.ts
│       ├── profile/
│       │   ├── route.ts           # PATCH current user
│       │   └── [username]/route.ts
│       └── users/
│           └── search/route.ts    # GET ?q= for custom picker
│
├── components/
│   ├── feed/
│   │   ├── Feed.tsx
│   │   └── PostCard.tsx
│   ├── forms/
│   │   ├── PostForm.tsx
│   │   ├── FileUpload.tsx
│   │   └── VisibilitySelector.tsx
│   ├── dashboard/
│   │   └── Dashboard.tsx
│   ├── profile/
│   │   ├── ProfileHeader.tsx
│   │   └── ProfilePosts.tsx
│   └── ui/
│       ├── Navbar.tsx
│       ├── Avatar.tsx
│       └── Modal.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server component client
│   │   └── admin.ts               # Service role (server only)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePosts.ts
│   │   └── useUpload.ts
│   ├── queries/
│   │   └── index.ts               # Reusable query functions
│   └── types/
│       ├── database.ts            # Hand-written types (bootstrap)
│       └── supabase.ts            # Auto-generated by Supabase CLI
│
├── middleware.ts                  # Route protection + session refresh
├── .env.local                     # Local secrets (gitignored)
├── .env.example                   # Template for env vars
├── next.config.js
└── tailwind.config.ts`}</Code>
    </div>
  );
}

function DeploySection() {
  return (
    <div>
      <H2>Step 1 — Bootstrap the App</H2>
      <Code lang="bash">{`npx create-next-app@latest filefiesta \\
  --typescript --tailwind --app --src-dir=false

cd filefiesta

npm install \\
  @supabase/supabase-js \\
  @supabase/auth-helpers-nextjs \\
  date-fns lucide-react`}</Code>

      <H2>Step 2 — Supabase Setup</H2>
      <div className="space-y-2 text-sm text-slate-400 my-3">
        {[
          "1. Create project at supabase.com → save Project URL + anon key + service_role key",
          "2. SQL Editor → run schema.sql (tables, triggers, RLS)",
          "3. Storage → create 'post-files' bucket (private, 50MB) and 'avatars' (public, 5MB)",
          "4. SQL Editor → run storage-policies.sql",
          "5. Auth → URL Configuration → add your Vercel URL to Redirect URLs",
        ].map((s, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-blue-400 flex-shrink-0">→</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <H2>Step 3 — Environment Variables</H2>
      <Code lang="bash">{`# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...     # safe to expose
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...          # server only, never expose`}</Code>

      <H2>Step 4 — Generate TypeScript Types</H2>
      <Code lang="bash">{`npx supabase login
npx supabase gen types typescript \\
  --project-id your-project-ref-id \\
  --schema public \\
  > lib/types/supabase.ts`}</Code>

      <H2>Step 5 — Deploy to Vercel</H2>
      <Code lang="bash">{`# Option A: Via Vercel CLI
npm install -g vercel
vercel

# Option B: GitHub → vercel.com → Import Project
# 1. Push code to GitHub
# 2. Import at vercel.com/new
# 3. Add env vars in project settings
# 4. Deploy`}</Code>

      <Note>After deploying, copy your Vercel production URL (e.g., https://filefiesta.vercel.app) and add it to Supabase Auth → URL Configuration → Allowed Redirect URLs.</Note>
    </div>
  );
}

function ScaleSection() {
  return (
    <div>
      <H2>Database Indexing Strategy</H2>
      <Code lang="sql">{`-- Already included in schema.sql. Additional indexes for growth:

-- Composite index for filtered user feeds
CREATE INDEX idx_posts_user_visibility
  ON public.posts(user_id, visibility, created_at DESC);

-- When posts table exceeds ~10M rows, partition by month:
CREATE TABLE posts_2025_q1 PARTITION OF posts
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');`}</Code>

      <H2>Cursor Pagination vs. Offset</H2>
      <Table
        headers={["Approach", "Performance", "Consistency", "Use Case"]}
        rows={[
          ["OFFSET (page=1,2,3)", "Degrades O(n)", "Misses new posts", "Never use for feeds"],
          ["Cursor (created_at)", "Constant O(1)", "Stable", "✅ FileFiesta default"],
          ["Keyset (id + created_at)", "Best for high-write", "Stable", "Scale > 100k rps"],
        ]}
      />

      <H2>Caching Layer</H2>
      <Code lang="typescript">{`// Install: npm install @upstash/redis
import { Redis } from '@upstash/redis'
const redis = Redis.fromEnv()

// Cache public feed page 1 for 30 seconds
export async function GET(req: NextRequest) {
  const cached = await redis.get<Post[]>('feed:page1')
  if (cached) return NextResponse.json({ data: cached, cached: true })

  const { data } = await getPublicFeed()
  await redis.setex('feed:page1', 30, data)
  return NextResponse.json({ data })
}

// Invalidate on new post
await redis.del('feed:page1')`}</Code>

      <H2>Rate Limiting</H2>
      <Code lang="typescript">{`// Install: npm install @upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1m'), // 10/min per user
  analytics: true,
})

// In POST /api/posts:
const { success, limit, reset } = await ratelimit.limit(user.id)
if (!success) {
  return NextResponse.json(
    { error: 'Rate limit exceeded', resetAt: reset },
    { status: 429, headers: { 'Retry-After': String(reset) } }
  )
}`}</Code>

      <H2>Phase 2 — Feature Additions</H2>
      <Table
        headers={["Feature", "New Tables", "Notes"]}
        rows={[
          ["Likes", "post_likes(post_id, user_id)", "Unique constraint prevents double-like"],
          ["Comments", "comments(id, post_id, user_id, content, created_at)", "RLS mirrors post visibility"],
          ["Follows", "follows(follower_id, following_id, created_at)", "Enables personalized feed"],
          ["Notifications", "notifications(id, user_id, type, payload, read)", "Use Supabase Realtime"],
          ["Collections", "collections + collection_posts", "Personal folders for vault"],
          ["Tags", "tags + post_tags", "Hashtag/category system"],
          ["Reactions", "post_reactions(post_id, user_id, emoji)", "Extend beyond likes"],
        ]}
      />

      <H2>Realtime Feed Updates</H2>
      <Code lang="typescript">{`// Subscribe to new public posts (in Feed.tsx)
useEffect(() => {
  const channel = supabase
    .channel('public-feed')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'posts',
      filter: 'visibility=eq.public',
    }, (payload) => {
      setPosts(prev => [payload.new as Post, ...prev])
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [])`}</Code>
    </div>
  );
}

const SECTION_CONTENT = {
  overview: <OverviewSection />,
  schema: <SchemaSection />,
  rls: <RLSSection />,
  storage: <StorageSection />,
  api: <APISection />,
  queries: <QueriesSection />,
  components: <ComponentsSection />,
  auth: <AuthSection />,
  folders: <FoldersSection />,
  deploy: <DeploySection />,
  scale: <ScaleSection />,
};

export default function App() {
  const [active, setActive] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col" style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <span className="font-bold text-white tracking-tight">FileFiesta</span>
            <span className="hidden sm:block text-xs text-slate-500 border border-slate-700 px-2 py-0.5 rounded-md">Architecture Docs</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="blue">Next.js 14</Badge>
            <Badge color="green">Supabase</Badge>
            <Badge color="purple">PostgreSQL</Badge>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-screen-xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-56 flex-shrink-0 border-r border-slate-800 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-3 gap-0.5">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all
                ${active === s.id
                  ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }
              `}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden w-full">
          <div className="border-b border-slate-800 px-4 py-2">
            <select
              value={active}
              onChange={e => setActive(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm border border-slate-700"
            >
              {SECTIONS.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-6 md:p-8 overflow-x-hidden">
          <div className="max-w-3xl">
            {SECTION_CONTENT[active]}
          </div>
        </main>
      </div>
    </div>
  );
}
