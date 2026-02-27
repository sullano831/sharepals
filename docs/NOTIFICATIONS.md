# Notification Bell — How It Works

## Notification functionality (requirements)

| Requirement | Implementation |
|-------------|----------------|
| **Create notification when someone follows** | Each new row in `follows` where `following_id` = you is shown as a notification (GET returns these; no separate “create” step). |
| **Create notification when someone follows back** | Same follow row is shown as “X followed you back” when you already follow them (`followed_you_back: true`). |
| **Checkbox selection for deleting notifications completely** | Per-item checkbox + “Remove selected” → POST each as dismiss; they are removed from the list and stay removed (stored in `notification_dismissals`). |
| **Clear all button for deleting all notifications completely** | “Clear all” → POST `clearAll: true` → all current follow notifications are dismissed and no longer shown. |
| **Red dot removed when notification viewed** | Opening the panel sets `notificationsViewed = true`; red dot shows only when there are notifications and `!notificationsViewed`. |

---

## Overview

The notification bell in the header shows **follow events**: people who followed you, and when they **followed you back** (you followed them and they later followed you). You can dismiss notifications individually or clear all; the red dot indicates unseen notifications until you open the panel.

---

## Data flow

```
┌─────────────────┐     GET /api/notifications      ┌──────────────────────┐
│  AppHeader      │ ◄────────────────────────────── │  follows (who        │
│  (bell + list)  │                                 │  followed me)        │
│                 │     POST /api/notifications     │  - notification_     │
│                 │ ──────────────────────────────►  │    dismissals        │
└─────────────────┘     (dismiss one or clear all)   └──────────────────────┘
```

- **Source of truth**: `follows` (who followed you) minus `notification_dismissals` (what you’ve dismissed).
- **Red dot**: Shown when there is at least one notification and you haven’t opened the panel since (client state `notificationsViewed`).
- **Opening the panel**: Marks as “viewed” (hides red dot) and refetches notifications + buddies (for “Follow back” / “Following”).

---

## Backend

### Tables

| Table | Purpose |
|-------|--------|
| `follows` | `follower_id` followed `following_id` at `created_at`. Notifications = rows where `following_id` = current user. |
| `notification_dismissals` | `(user_id, follower_id, followed_at)` = one dismissed notification. GET excludes these. |

**Setup:** Dismissals only persist if the table exists. In the Supabase SQL Editor, run the contents of `migrations/004_notification_dismissals.sql` once. Until then, GET still works (no dismissals), but POST dismiss may return 500 and removed notifications will reappear on refresh.

### API

| Method | Route | Purpose |
|--------|--------|--------|
| **GET** | `/api/notifications` | Returns active notifications: follows where you’re the followed user, excluding dismissed. Each item includes `followed_you_back` (you already follow them). |
| **POST** | `/api/notifications` | Dismiss: body `{ follower_id, created_at }` for one, or `{ clearAll: true }` for all. |

Timestamps are normalized (ISO) so matching works across formats.

---

## Frontend (AppHeader)

### State

| State | Role |
|-------|------|
| `notifications` | List from GET; drives list UI and red dot presence. |
| `notificationsViewed` | Red dot hidden after opening panel once. |
| `selectedNotifKeys` | Checkboxes: which notifications are selected for “Remove selected”. |
| `followedBackIds` | Who you already follow (for “Follow back” vs “Following”). |
| `notifLoading` / `dismissLoading` | Loading states for fetch and dismiss. |

### When data is fetched

1. **On load (user set)**  
   Fetch notifications once so the red dot can show before the user opens the panel.

2. **When panel opens**  
   Refetch notifications and buddies so the list and “Follow back” state are up to date; set `notificationsViewed = true` so the red dot disappears.

3. **After “Remove selected” fails**  
   Refetch notifications so the list matches the server again.

### Actions

- **Remove selected**: Optimistically remove selected items, POST each as dismiss; on any failure, refetch.
- **Clear all**: Optimistically clear list, POST `clearAll: true`.
- **Follow back**: POST `/api/follow`; then add that user to `followedBackIds`.

---

## Notification key (identity)

A notification is uniquely identified by `(follower_id, created_at)`. The client uses a key like `follower_id|iso(created_at)` for selection and dismiss. The API matches dismissals using the same logical pair with normalized timestamps.
