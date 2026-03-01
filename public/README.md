# Static assets

Put your **main logo** and other static files here. They are served from the site root.

## Logo

- **Recommended path:** `public/logo.png` (or `logo.svg`)
- **Use in code:** `src="/logo.png"` (no `public` in the path)

Example in a component:
```tsx
<img src="/logo.png" alt="SharePals" className="h-8 w-auto" />
```

Optional: use a subfolder for organization, e.g. `public/images/logo.png` → `src="/images/logo.png"`.
