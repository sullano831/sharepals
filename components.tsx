// ============================================================
// FileFiesta — React Components
// All components use Next.js App Router + Tailwind CSS
// ============================================================


// ────────────────────────────────────────────────────────────
// components/forms/VisibilitySelector.tsx
// ────────────────────────────────────────────────────────────
'use client'
import { useState } from 'react'
import type { Visibility } from '@/lib/types/database'

interface VisibilitySelectorProps {
  value: Visibility
  onChange: (value: Visibility) => void
  onUsersChange?: (userIds: string[]) => void
  selectedUsers?: { id: string; username: string; display_name: string }[]
}

const OPTIONS: { value: Visibility; label: string; icon: string; description: string }[] = [
  { value: 'public',  label: 'Public',  icon: '🌐', description: 'Visible to everyone in the feed' },
  { value: 'private', label: 'Private', icon: '🔒', description: 'Only visible to you' },
  { value: 'custom',  label: 'Custom',  icon: '👥', description: 'Choose who can see this' },
]

export function VisibilitySelector({
  value,
  onChange,
  onUsersChange,
  selectedUsers = [],
}: VisibilitySelectorProps) {
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  async function handleSearch(q: string) {
    setUserSearch(q)
    if (q.length < 2) { setSearchResults([]); return }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setSearchResults(data)
  }

  function addUser(user: any) {
    if (selectedUsers.find(u => u.id === user.id)) return
    onUsersChange?.([...selectedUsers.map(u => u.id), user.id])
    setUserSearch('')
    setSearchResults([])
  }

  function removeUser(id: string) {
    onUsersChange?.(selectedUsers.filter(u => u.id !== id).map(u => u.id))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`
              flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm
              transition-all cursor-pointer
              ${value === opt.value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }
            `}
          >
            <span className="text-xl">{opt.icon}</span>
            <span className="font-medium">{opt.label}</span>
            <span className="text-xs text-center text-gray-500 hidden md:block">
              {opt.description}
            </span>
          </button>
        ))}
      </div>

      {value === 'custom' && (
        <div className="border border-gray-200 rounded-xl p-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">Add people who can view this post</p>
          <input
            type="text"
            value={userSearch}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by username..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchResults.length > 0 && (
            <ul className="border border-gray-200 rounded-lg overflow-hidden">
              {searchResults.map((user: any) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => addUser(user)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                      {user.display_name[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium">{user.display_name}</span>
                      <span className="text-gray-400 ml-1">@{user.username}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(user => (
                <span
                  key={user.id}
                  className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
                >
                  @{user.username}
                  <button type="button" onClick={() => removeUser(user.id)} className="ml-1 hover:text-blue-900">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// ────────────────────────────────────────────────────────────
// components/forms/PostForm.tsx
// ────────────────────────────────────────────────────────────
'use client'
import { useState, useRef } from 'react'
import type { Visibility } from '@/lib/types/database'
import { VisibilitySelector } from './VisibilitySelector'

interface PostFormProps {
  onSuccess?: () => void
  editPost?: any // existing post for edit mode
}

export function PostForm({ onSuccess, editPost }: PostFormProps) {
  const isEdit = !!editPost
  const [content, setContent]         = useState(editPost?.content ?? '')
  const [link, setLink]               = useState(editPost?.external_link ?? '')
  const [visibility, setVisibility]   = useState<Visibility>(editPost?.visibility ?? 'public')
  const [allowedUsers, setAllowedUsers] = useState<string[]>([])
  const [file, setFile]               = useState<File | null>(null)
  const [uploading, setUploading]     = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [dragOver, setDragOver]       = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  async function uploadFile(): Promise<{ path: string; name: string; type: string; size: number } | null> {
    if (!file) return null
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    setUploading(false)
    if (!res.ok) throw new Error('File upload failed')
    return res.json()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!content && !file && !link) {
      setError('Add some content, a file, or a link.')
      return
    }
    if (visibility === 'custom' && allowedUsers.length === 0) {
      setError('Add at least one person for custom visibility.')
      return
    }

    try {
      setSubmitting(true)
      let fileData = null

      if (file) {
        fileData = await uploadFile()
      }

      const payload = {
        content: content || undefined,
        external_link: link || undefined,
        visibility,
        allowed_user_ids: visibility === 'custom' ? allowedUsers : undefined,
        ...(fileData && {
          file_url: fileData.path,
          file_name: fileData.name,
          file_type: fileData.type,
          file_size: fileData.size,
        }),
      }

      const url = isEdit ? `/api/posts/${editPost.id}` : '/api/posts'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }

      setContent('')
      setLink('')
      setFile(null)
      setVisibility('public')
      setAllowedUsers([])
      onSuccess?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What are you sharing today?"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={3}
      />

      {/* File drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-4 text-center cursor-pointer text-sm transition
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
          ${file ? 'bg-green-50 border-green-300' : ''}
        `}
      >
        {file ? (
          <p className="text-green-700">
            📎 {file.name} <span className="text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            <button
              type="button"
              className="ml-2 text-red-500 hover:underline"
              onClick={e => { e.stopPropagation(); setFile(null) }}
            >
              Remove
            </button>
          </p>
        ) : (
          <p className="text-gray-400">
            📁 Drop a file here or <span className="text-blue-500">browse</span>
            <span className="block text-xs mt-1">PDF, DOCX, images, video, audio — max 50MB</span>
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mp3,.wav,.zip,.txt,.csv"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* External link */}
      <input
        type="url"
        value={link}
        onChange={e => setLink(e.target.value)}
        placeholder="🔗 Paste an external link (optional)"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <VisibilitySelector
        value={visibility}
        onChange={setVisibility}
        onUsersChange={setAllowedUsers}
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition"
        >
          {uploading ? 'Uploading...' : submitting ? 'Posting...' : isEdit ? 'Save Changes' : 'Post'}
        </button>
      </div>
    </form>
  )
}


// ────────────────────────────────────────────────────────────
// components/feed/PostCard.tsx
// ────────────────────────────────────────────────────────────
'use client'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { Post } from '@/lib/types/database'
import { PostForm } from '@/components/forms/PostForm'

const VISIBILITY_BADGE: Record<string, { label: string; className: string }> = {
  public:  { label: '🌐 Public',  className: 'bg-green-50 text-green-700' },
  private: { label: '🔒 Private', className: 'bg-gray-100 text-gray-600' },
  custom:  { label: '👥 Custom',  className: 'bg-purple-50 text-purple-700' },
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <span>🖼️</span>
  if (mimeType.includes('pdf'))      return <span>📄</span>
  if (mimeType.includes('word'))     return <span>📝</span>
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <span>📊</span>
  if (mimeType.startsWith('video/')) return <span>🎬</span>
  if (mimeType.startsWith('audio/')) return <span>🎵</span>
  return <span>📎</span>
}

interface PostCardProps {
  post: Post
  isOwner?: boolean
  onDelete?: (id: string) => void
  onRefresh?: () => void
}

export function PostCard({ post, isOwner, onDelete, onRefresh }: PostCardProps) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const badge = VISIBILITY_BADGE[post.visibility]

  async function handleDelete() {
    if (!confirm('Delete this post?')) return
    setDeleting(true)
    await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
    onDelete?.(post.id)
  }

  if (editing) {
    return (
      <div className="border border-blue-200 rounded-2xl p-5 bg-blue-50/30">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium text-blue-700">Editing post</p>
          <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
        <PostForm editPost={post} onSuccess={() => { setEditing(false); onRefresh?.() }} />
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {post.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{post.profiles?.display_name}</p>
            <p className="text-xs text-gray-400">
              @{post.profiles?.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.className}`}>
            {badge.label}
          </span>
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                ···
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[140px] overflow-hidden">
                  <button
                    onClick={() => { setEditing(true); setMenuOpen(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => { handleDelete(); setMenuOpen(false) }}
                    disabled={deleting}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    🗑️ {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="mt-3 text-gray-800 text-sm leading-relaxed whitespace-pre-line">
          {post.content}
        </p>
      )}

      {/* File attachment */}
      {post.file_url && (
        <a
          href={post.signed_url ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition group"
        >
          <span className="text-2xl">
            <FileTypeIcon mimeType={post.file_type ?? ''} />
          </span>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-blue-600 group-hover:underline truncate">
              {post.file_name ?? 'Download file'}
            </p>
            {post.file_size && (
              <p className="text-xs text-gray-400">
                {(post.file_size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
        </a>
      )}

      {/* External link */}
      {post.external_link && (
        <a
          href={post.external_link}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
        >
          {post.link_image && (
            <img
              src={post.link_image}
              alt=""
              className="w-full h-36 object-cover rounded-lg mb-2"
            />
          )}
          <p className="text-sm font-semibold text-gray-900 truncate">
            {post.link_title ?? post.external_link}
          </p>
          {post.link_description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {post.link_description}
            </p>
          )}
          <p className="text-xs text-blue-500 mt-1 truncate">{post.external_link}</p>
        </a>
      )}
    </div>
  )
}


// ────────────────────────────────────────────────────────────
// components/feed/Feed.tsx
// ────────────────────────────────────────────────────────────
'use client'
import { useEffect, useState, useCallback } from 'react'
import { PostCard } from './PostCard'
import type { Post } from '@/lib/types/database'

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)

    const url = cursor
      ? `/api/posts?cursor=${encodeURIComponent(cursor)}`
      : '/api/posts'

    const res = await fetch(url)
    const { data, nextCursor, hasMore: more } = await res.json()

    setPosts(prev => cursor ? [...prev, ...data] : data)
    setCursor(nextCursor)
    setHasMore(more)
    setLoading(false)
    setInitialLoad(false)
  }, [cursor, loading, hasMore])

  useEffect(() => {
    loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (initialLoad) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/6" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-2">🎉</p>
        <p className="font-medium">No posts yet. Be the first to share!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasMore && (
        <div className="text-center py-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}


// ────────────────────────────────────────────────────────────
// components/dashboard/Dashboard.tsx
// ────────────────────────────────────────────────────────────
'use client'
import { useEffect, useState } from 'react'
import { PostForm } from '@/components/forms/PostForm'
import { PostCard } from '@/components/feed/PostCard'
import type { Post, Visibility } from '@/lib/types/database'

const TABS: { label: string; value: Visibility | 'all' }[] = [
  { label: 'All Posts', value: 'all' },
  { label: '🌐 Public', value: 'public' },
  { label: '🔒 Private', value: 'private' },
  { label: '👥 Custom',  value: 'custom' },
]

export function Dashboard() {
  const [posts, setPosts]   = useState<Post[]>([])
  const [tab, setTab]       = useState<Visibility | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats]   = useState({ total: 0, public: 0, private: 0, custom: 0 })

  async function loadPosts() {
    setLoading(true)
    const url = tab === 'all' ? '/api/posts/mine' : `/api/posts/mine?visibility=${tab}`
    const res = await fetch(url)
    const { data } = await res.json()
    setPosts(data ?? [])

    // Calculate stats
    const all = tab === 'all' ? (data ?? []) : posts
    setStats({
      total:   all.length,
      public:  all.filter((p: Post) => p.visibility === 'public').length,
      private: all.filter((p: Post) => p.visibility === 'private').length,
      custom:  all.filter((p: Post) => p.visibility === 'custom').length,
    })
    setLoading(false)
  }

  useEffect(() => { loadPosts() }, [tab])

  function handleDelete(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Vault</h1>
        <p className="text-sm text-gray-500">Manage all your posts and files</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',   value: stats.total,   color: 'bg-gray-50' },
          { label: 'Public',  value: stats.public,  color: 'bg-green-50' },
          { label: 'Private', value: stats.private, color: 'bg-gray-100' },
          { label: 'Custom',  value: stats.custom,  color: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New post form */}
      <PostForm onSuccess={loadPosts} />

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`
              flex-1 text-sm py-1.5 px-2 rounded-lg font-medium transition
              ${tab === t.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {loading ? (
        <p className="text-center text-gray-400 py-8">Loading...</p>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p>No {tab === 'all' ? '' : tab} posts yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              isOwner
              onDelete={handleDelete}
              onRefresh={loadPosts}
            />
          ))}
        </div>
      )}
    </div>
  )
}
