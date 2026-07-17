# Feature Flags System

> **Priority:** High
> **Status:** Pending
> **Estimated complexity:** Large
> **Depends on:** Nothing
> **Blocks:** User last seen tracking (and any future toggleable feature)

---

## Overview

Add a database-backed feature flag system that lets superadmins enable or disable platform features from the dashboard. Every optional feature checks its flag before executing. This keeps Vellum simple by default, reduces unnecessary DB load, and lets admins customize which features are active.

## Current State

- No feature flag system exists
- All features run unconditionally (Telegram, push notifications, activity snapshots, audit log snapshots, etc.)
- No way for admins to toggle features without code changes
- `platform_settings` table exists but is used for Telegram config, not feature toggles

## Design Principles

1. **Simple** — one table, one cache, one helper function
2. **Fast** — flags cached in memory, not queried on every request
3. **Safe** — disabled features skip ALL related logic (no partial execution)
4. **Observable** — superadmin UI shows what's on/off with clear labels
5. **Agent-friendly** — new features MUST declare a flag if they're optional

## Database Changes

### New table: `feature_flags`

```ts
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  label: text("label").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Key design decisions:**
- `key` is the programmatic identifier (e.g. `tracking.lastSeen`, `notifications.telegram`)
- `enabled` is the toggle — `true` = feature runs, `false` = feature is skipped entirely
- `category` groups flags in the UI (e.g. "Notifications", "Tracking", "Integrations")
- `label` is the human-readable name shown in the admin UI

## Seed Data — Default Flags

| key | label | category | default | Description |
|-----|-------|----------|---------|-------------|
| `notifications.push` | Push Notifications | Notifications | true | Browser push notifications via Web Push (VAPID) |
| `notifications.telegram` | Telegram Bot | Notifications | true | Telegram bot for DM and supergroup notifications |
| `notifications.email` | Email Notifications | Notifications | false | Email notifications (Resend/SendGrid) |
| `tracking.lastSeen` | User Last Seen | Tracking | true | Record last activity time/IP on every request |
| `tracking.activitySnapshots` | Activity Snapshots | Tracking | true | Store entity snapshots in audit log (before/after) |
| `audit.enabled` | Audit Logging | Security | true | Log all mutations to activity_logs |
| `realtime.enabled` | Real-time Updates | Collaboration | true | Pusher-based live updates |

## API Routes

### Public: `GET /api/feature-flags`

Returns enabled flags only. Used by client components to gate UI elements.

```json
{
  "flags": {
    "notifications.push": true,
    "notifications.telegram": true,
    "tracking.lastSeen": false
  }
}
```

No auth required — only returns `true`/`false`, not descriptions or admin metadata.

### Superadmin: `GET /api/super-admin/feature-flags`

Returns all flags with full metadata.

```json
{
  "flags": [
    {
      "id": "uuid",
      "key": "tracking.lastSeen",
      "enabled": false,
      "label": "User Last Seen",
      "description": "Record last activity time/IP on every request",
      "category": "Tracking",
      "updatedAt": "..."
    }
  ]
}
```

### Superadmin: `PUT /api/super-admin/feature-flags`

Update one or more flags.

```json
{
  "updates": [
    { "key": "tracking.lastSeen", "enabled": false },
    { "key": "notifications.telegram", "enabled": true }
  ]
}
```

Response: returns updated flags. Invalidates the in-memory cache.

## Server Helper

### `src/lib/feature-flags.ts`

```ts
import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";

const FLAG_CACHE_TTL = 60_000; // 60 seconds
let flagCache: Map<string, boolean> | null = null;
let cacheTimestamp = 0;

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getAllFlags();
  return flags.get(key) ?? false;
}

export async function getAllFlags(): Promise<Map<string, boolean>> {
  const now = Date.now();
  if (flagCache && now - cacheTimestamp < FLAG_CACHE_TTL) {
    return flagCache;
  }

  const rows = await db.select().from(featureFlags);
  const map = new Map(rows.map((r) => [r.key, r.enabled]));
  flagCache = map;
  cacheTimestamp = now;
  return map;
}

export function invalidateFlagCache(): void {
  flagCache = null;
  cacheTimestamp = 0;
}
```

**Usage in API routes:**
```ts
import { isFeatureEnabled } from "@/lib/feature-flags";

// In a mutation route:
if (await isFeatureEnabled("tracking.lastSeen")) {
  await db.update(users).set({ lastSeenAt: new Date(), lastSeenIp: ip }).where(eq(users.id, userId));
}
```

**Usage in server components:**
```ts
const pushEnabled = await isFeatureEnabled("notifications.push");
```

## UI Changes

### Superadmin Dashboard — Feature Flags Section

Add a new tab or section in the superadmin dashboard:

- Grouped by category (Notifications, Tracking, Security, Collaboration)
- Toggle switch per feature (same style as notification preferences)
- Label + description per feature
- "Last updated" timestamp per flag
- Save button (batch update)
- Toast on save: "Feature flags updated"

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/feature-flags.ts` | Server helper: `isFeatureEnabled()`, `getAllFlags()`, `invalidateFlagCache()` |
| `src/app/api/feature-flags/route.ts` | Public GET endpoint (enabled flags only) |
| `src/app/api/super-admin/feature-flags/route.ts` | Superadmin GET + PUT |
| `src/app/dashboard/super-admin/SuperAdminFeatureFlagsPanel.tsx` | Toggle UI |

## Files to Modify

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `featureFlags` table |
| `src/app/dashboard/super-admin/SuperAdminClient.tsx` | Add Feature Flags tab |
| All optional feature routes | Wrap logic in `if (await isFeatureEnabled("..."))` |
| `AGENTS.md` | Add convention: new optional features must include a feature flag |
| `STRUCTURE.md` | Add new files to docs |
| `TODO.md` | Move to DONE when complete |
| `DONE.md` | Add entry when complete |

## Migration Strategy

1. Create `feature_flags` table + migration
2. Seed default flags
3. Build `src/lib/feature-flags.ts` with caching
4. Build public API route
5. Build superadmin API route
6. Build FeatureFlagsPanel UI
7. Wire into SuperAdminClient tabs
8. Update existing features to check flags (one by one)
9. Update AGENTS.md with convention
10. Update STRUCTURE.md, TODO.md, DONE.md
11. Lint, typecheck, build

## Acceptance Criteria

- [ ] `feature_flags` table exists with seeded flags
- [ ] `isFeatureEnabled(key)` works with 60s in-memory cache
- [ ] `GET /api/feature-flags` returns enabled flags (no auth)
- [ ] `GET/PUT /api/super-admin/feature-flags` works (superadmin only)
- [ ] Superadmin UI shows toggles grouped by category
- [ ] Disabling a flag causes all related logic to be skipped
- [ ] Enabling a flag re-enables the feature within 60s
- [ ] Cache is invalidated on flag update
- [ ] AGENTS.md documents the convention for new features
- [ ] All existing optional features are gated
- [ ] `bun run lint`, `bun run typecheck`, `bun run build` all pass
