# Telegram Bot Integration — Full Plan

## Overview

Platform-wide Telegram bot for notifications. Superadmins configure a single bot token. Users bind their Telegram account via a pairing code. Notifications are sent per user preferences (push / email / in-app / telegram). The bot also posts typed notifications to a configured Telegram supergroup (with topics) and can broadcast to channels.

## Current State

- `notificationPreferences` table already has `pushEnabled`, `inAppEnabled`, `emailEnabled` columns.
- `notificationEventTypeEnum` exists with 6 event types.
- `sendInAppNotification()` in `src/lib/notifications.ts` handles in-app notifications + Pusher broadcast.
- `src/lib/push.ts` handles Web Push notifications.
- Settings page at `/dashboard/settings` already shows Push / In-App / Email toggles per event type.
- Superadmin dashboard exists at `/dashboard/super-admin` with tabbed panels.
- No Telegram-related tables, APIs, or UI exist yet.

## Database Changes

### 1. Add `telegramEnabled` to `notificationPreferences`
```ts
// src/db/schema.ts - notificationPreferences table
telegramEnabled: boolean("telegram_enabled").default(false).notNull(),
```

### 2. Add `telegramChatId` and `telegramUsername` to `users`
```ts
// src/db/schema.ts - users table
telegramChatId: text("telegram_chat_id"),
telegramUsername: text("telegram_username"),
```

### 3. Add `telegramPairingCodes` table
```ts
export const telegramPairingCodes = pgTable("telegram_pairing_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 4. Add `platformSettings` table (for superadmin-configurable settings)
```ts
export const platformSettings = pgTable("platform_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```
Keys used:
- `telegram_bot_token`
- `telegram_supergroup_id`
- `telegram_channel_id`

## API Routes

### User-facing (authenticated)

| Route | Methods | Purpose |
|-------|---------|---------|
| `GET /api/telegram/pairing-code` | GET | Generate a new pairing code for current user |
| `DELETE /api/telegram/unlink` | DELETE | Unlink Telegram from current user |

### Superadmin-only

| Route | Methods | Purpose |
|-------|---------|---------|
| `GET /api/super-admin/telegram/settings` | GET | Get current Telegram settings (token masked) |
| `PATCH /api/super-admin/telegram/settings` | PATCH | Update bot token, supergroup ID, channel ID |
| `POST /api/super-admin/telegram/test` | POST | Test bot connectivity (send a test message) |
| `GET /api/super-admin/telegram/stats` | GET | Paired user count |

### Webhook (public, secured by bot token)

| Route | Methods | Purpose |
|-------|---------|---------|
| `POST /api/telegram/webhook` | POST | Receive Telegram Bot API updates |

## Server Library (`src/lib/telegram.ts`)

Functions:
- `sendTelegramMessage(chatId: string, text: string, options?)` — raw Bot API `sendMessage`
- `sendTelegramNotification(userId: string, eventType: string, title: string, content: string)` — check prefs, send if enabled
- `broadcastToSupergroup(topicId: string | null, text: string)` — send to supergroup, optionally a topic
- `broadcastToChannel(text: string)` — send to channel
- `setTelegramWebhook()` — configure webhook on bot startup / settings update
- `getTelegramBotInfo()` — get bot name / username for UI display

## Notification Pipeline Update

In `src/lib/notifications.ts`, extend `sendInAppNotification` or create a new `sendNotification()` wrapper that:
1. Creates in-app notification (existing)
2. Sends push notification via `sendPushNotification()` (existing)
3. Sends Telegram message via `sendTelegramNotification()` (new)
4. (Future) Sends email

All mutation routes that currently call `sendInAppNotification()` should be updated to call the new unified `sendNotification()` wrapper.

## UI Changes

### Settings Page (`/dashboard/settings`)
- Add Telegram section:
  - If not paired: show pairing code + instructions ("Send `/start <code>` to @BotName")
  - If paired: show linked Telegram username, "Unlink" button
  - Add "Telegram" toggle column in the notification preferences table

### Superadmin Dashboard (`/dashboard/super-admin`)
- New tab: **Telegram**
  - Bot token input (password field, masked)
  - Supergroup ID input
  - Channel ID input
  - "Test Connection" button
  - Bot info display (name, username)
  - Paired user count
  - "Set Webhook" button (manual trigger)

### Sidebar
- No change needed.

## Webhook Handler Flow

`POST /api/telegram/webhook`:
1. Verify request is from Telegram (no secret needed; route is unguessable + HTTPS)
2. Parse update JSON
3. If `message.text` starts with `/start <code>`:
   - Look up code in `telegramPairingCodes`
   - If valid, unused, not expired:
     - Update `users.telegramChatId` = `message.chat.id`
     - Update `users.telegramUsername` = `message.from.username`
     - Mark code as used
     - Reply "Your Telegram has been linked to Vellum."
   - If invalid/used/expired: reply "Invalid or expired code."
4. If `/start` without code: reply with generic welcome + instructions
5. Other commands: ignore or reply with help

## Migration Strategy

1. Add `telegramEnabled` to `notificationPreferences`
2. Add `telegramChatId` and `telegramUsername` to `users`
3. Create `telegramPairingCodes` table
4. Create `platformSettings` table
5. Run `bun run db:generate` — commit migration files
6. Implement `src/lib/telegram.ts`
7. Add `/api/telegram/*` routes
8. Add `/api/super-admin/telegram/*` routes
9. Update settings page UI
10. Update superadmin dashboard with Telegram tab
11. Update `sendInAppNotification` → unified `sendNotification` in mutation routes
12. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_URL` to `.env.example`
13. Run lint → typecheck → build
14. Update docs: `TODO.md`, `STRUCTURE.md`, `AGENTS.md`

## Acceptance Criteria

- [ ] Superadmin can configure bot token, supergroup ID, channel ID in superadmin panel
- [ ] Superadmin can test bot connectivity
- [ ] Users can generate a pairing code in settings
- [ ] Users can link Telegram by sending `/ start <code>` to the bot
- [ ] Users can unlink Telegram account
- [ ] Users can enable/disable Telegram per event type in notification preferences
- [ ] Notifications are sent via Telegram when enabled and user is paired
- [ ] Typed notifications are posted to the configured supergroup (with topic mapping)
- [ ] Webhook is set automatically when settings change
- [ ] Paired user count is visible to superadmin
- [ ] All changes pass `lint` → `typecheck` → `build`

## Files to Create/Modify

### Create
- `TODO/telegram-bot-integration.md` (this file)
- `src/lib/telegram.ts`
- `src/app/api/telegram/pairing-code/route.ts`
- `src/app/api/telegram/unlink/route.ts`
- `src/app/api/telegram/webhook/route.ts`
- `src/app/api/super-admin/telegram/settings/route.ts`
- `src/app/api/super-admin/telegram/test/route.ts`
- `src/app/api/super-admin/telegram/stats/route.ts`
- `src/app/dashboard/super-admin/SuperAdminTelegramPanel.tsx`

### Modify
- `src/db/schema.ts`
- `src/lib/notifications.ts` (extend to unified send)
- `src/lib/push.ts` (maybe extract common pref checking)
- `src/app/dashboard/settings/page.tsx`
- `src/app/dashboard/super-admin/SuperAdminClient.tsx`
- `src/hooks/useNotificationPreferences.ts`
- `src/app/api/push/preferences/route.ts`
- `.env.example`
- `TODO.md`
- `STRUCTURE.md`
- `AGENTS.md` (if new conventions)
