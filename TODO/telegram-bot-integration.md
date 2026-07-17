# Telegram Bot Integration — Full Plan

> **Priority:** High
> **Status:** Done

## Overview

Platform-wide Telegram bot for notifications. Superadmins configure a single bot token. Users bind their Telegram account via a pairing code. Notifications are sent per user preferences (push / email / in-app / telegram). The bot also posts typed notifications to a configured Telegram supergroup (with topics) and can broadcast to channels.

## Current State

- `notificationPreferences` table already has `pushEnabled`, `inAppEnabled`, `emailEnabled`, `telegramEnabled` columns.
- `notificationEventTypeEnum` exists with 6 event types.
- `sendInAppNotification()` in `src/lib/notifications.ts` handles in-app notifications + Pusher broadcast.
- `sendNotification()` wrapper dispatches in-app + push + Telegram DM + supergroup broadcast + channel broadcast.
- `src/lib/push.ts` handles Web Push notifications.
- Settings page at `/dashboard/settings` shows Push / In-App / Email / Telegram toggles per event type.
- Superadmin dashboard exists at `/dashboard/super-admin` with tabbed panels including Telegram.
- `src/lib/telegram.ts` fully implemented: bot API wrapper, webhook with `secret_token`, topic mapping, channel events, message templates, `createForumTopic`.
- All Telegram tables, APIs, and UI exist and are functional.

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
- `telegram_webhook_secret` (auto-generated UUID, used for `setWebhook` `secret_token`)
- `telegram_topic_{eventType}` (per-event topic ID mapping)
- `telegram_channel_events` (comma-separated event types for channel broadcast)
- `telegram_template_{eventType}` (per-event HTML message template)

## API Routes

### User-facing (authenticated)

| Route | Methods | Purpose |
|-------|---------|---------|
| `GET /api/telegram/pairing-code` | GET | Generate a new pairing code for current user |
| `DELETE /api/telegram/unlink` | DELETE | Unlink Telegram from current user |
| `GET /api/telegram/status` | GET | Check if current user has linked Telegram |
| `GET /api/telegram/config` | GET | Public endpoint — check if bot is configured (no auth) |

### Superadmin-only

| Route | Methods | Purpose |
|-------|---------|---------|
| `GET /api/super-admin/telegram/settings` | GET | Get bot settings, topic mappings, channel events, templates, webhook URL |
| `PATCH /api/super-admin/telegram/settings` | PATCH | Update bot token, supergroup/channel IDs, topics, channel events, templates; auto-sets webhook on token change |
| `POST /api/super-admin/telegram/test` | POST | Test bot connectivity with optional token override |
| `GET /api/super-admin/telegram/stats` | GET | Paired user count |
| `POST /api/super-admin/telegram/topics` | POST | Create a forum topic in the configured supergroup |

### Webhook (public, secured by `secret_token` header)

| Route | Methods | Purpose |
|-------|---------|---------|
| `POST /api/telegram/webhook` | POST | Receive Telegram Bot API updates; verifies `X-Telegram-Bot-Api-Secret-Token` header |

## Server Library (`src/lib/telegram.ts`)

Functions:
- `getPlatformSetting(key)` / `setPlatformSetting(key, value)` — read/write `platform_settings`
- `getBotToken()` / `isTelegramConfigured()` — bot token helpers
- `getWebhookSecretToken()` — returns or auto-generates the webhook secret token (stored in `platform_settings`)
- `getTelegramBotInfo(token?)` — get bot name / username via `getMe`
- `setTelegramWebhook(webhookUrl, token?)` — registers webhook with `secret_token` parameter
- `sendTelegramMessage(chatId, text, options?, token?)` — raw Bot API `sendMessage`
- `isTelegramEnabled(userId, eventType)` — check user preference for Telegram channel
- `sendTelegramNotification({ userId, eventType, title, content, url })` — check prefs, send DM if enabled
- `broadcastToSupergroup(eventType, text)` — send to configured supergroup with topic routing
- `maybeBroadcastToChannel(eventType, title, content, url?)` — post to channel if event type is enabled
- `getTelegramTopicMapping(eventType)` — get topic ID for an event type
- `getChannelEvents()` / `setChannelEvents(events)` — manage which events broadcast to channel
- `getTelegramTemplate(eventType)` / `setTelegramTemplate(eventType, template)` — per-event message templates
- `getDefaultTemplate(eventType)` — default HTML template with `{title}`, `{content}`, `{url}` variables

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
- New tab: **Telegram** (`SuperAdminTelegramPanel.tsx`)
  - Bot token input (password field, masked on GET)
  - Webhook URL display with copy button; auto-sets webhook on save
  - Test connectivity with optional token override
  - Supergroup ID input
  - Channel ID input
  - Topic mapping: per-event forum topic ID inputs with inline "Create topic" buttons
  - Channel broadcast events: checkboxes per notification type
  - Message templates: per-event customizable HTML with `{title}`, `{content}`, `{url}` variables
  - Paired user count stat card
  - Save settings with mutation

### Sidebar
- No change needed.

## Webhook Handler Flow

`POST /api/telegram/webhook`:
1. Verify `X-Telegram-Bot-Api-Secret-Token` header matches the stored `telegram_webhook_secret` (auto-generated, passed to `setWebhook`)
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

- [x] Superadmin can configure bot token, supergroup ID, channel ID in superadmin panel
- [x] Superadmin can test bot connectivity (with optional token override)
- [x] Users can generate a pairing code in settings
- [x] Users can link Telegram by sending `/start <code>` to the bot
- [x] Users can unlink Telegram account
- [x] Users can enable/disable Telegram per event type in notification preferences
- [x] Notifications are sent via Telegram when enabled and user is paired
- [x] Typed notifications are posted to the configured supergroup (with topic mapping)
- [x] Channel broadcast for selected event types
- [x] Customizable HTML message templates with `{title}`, `{content}`, `{url}` variables
- [x] Webhook is set automatically when settings change, secured with `secret_token` header
- [x] Webhook handler verifies `X-Telegram-Bot-Api-Secret-Token` before processing
- [x] Superadmin can create forum topics in the supergroup via API
- [x] Paired user count is visible to superadmin
- [x] All changes pass `lint` → `typecheck` → `build`

## Files to Create/Modify

### Create
- `TODO/telegram-bot-integration.md` (this file)
- `src/lib/telegram.ts`
- `src/app/api/telegram/config/route.ts`
- `src/app/api/telegram/pairing-code/route.ts`
- `src/app/api/telegram/unlink/route.ts`
- `src/app/api/telegram/status/route.ts`
- `src/app/api/telegram/webhook/route.ts`
- `src/app/api/super-admin/telegram/settings/route.ts`
- `src/app/api/super-admin/telegram/test/route.ts`
- `src/app/api/super-admin/telegram/stats/route.ts`
- `src/app/api/super-admin/telegram/topics/route.ts`
- `src/app/dashboard/super-admin/SuperAdminTelegramPanel.tsx`
- `src/hooks/useTelegram.ts`

### Modify
- `src/db/schema.ts` (add `telegramEnabled`, `telegramChatId`, `telegramUsername`, `telegramPairingCodes`, `platformSettings`)
- `src/lib/notifications.ts` (unified `sendNotification()` wrapper)
- `src/lib/push.ts` (add `telegramEnabled` to defaults and `updateNotificationPreference`)
- `src/app/dashboard/settings/page.tsx` (Telegram section + 4-column preference grid)
- `src/app/dashboard/super-admin/SuperAdminClient.tsx` (add Telegram tab)
- `src/hooks/useNotificationPreferences.ts` (include `telegramEnabled`)
- `src/app/api/tasks/[id]/route.ts` (use `sendNotification`)
- `src/app/api/tasks/route.ts` (use `sendNotification`)
- `src/app/api/comments/route.ts` (use `sendNotification`)
- `.env.example`
- `TODO.md`
- `STRUCTURE.md`
- `DONE.md`
- `AGENTS.md` (if new conventions)
