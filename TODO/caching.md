# Caching Layer

> **Priority:** Medium
> **Status:** Pending
> **Estimated complexity:** Medium
> **Depends on:** Feature flags system (Phase 2 integration only; core cache works standalone)
> **Blocks:** None (reduces DB load across all other features)

---

## Overview

Add a generic caching layer using Redis, supporting both Upstash serverless Redis and self-hosted/custom Redis (local development or private infrastructure). Cache heavily-used DB lookups, session data, and computed values to reduce PostgreSQL load and improve response times. The cache must be efficient, easy to use, and safely invalidatable. Once the feature flags system ships, caching itself must be toggleable by superadmins.

## Design Principles

1. **Driver-agnostic** — Works with Upstash (`@upstash/redis`) or any Redis-compatible server (`ioredis` / `redis` Node client). Configured via env vars, no code changes required to switch.
2. **Single instance** — `src/lib/cache.ts` exports one `cache` singleton. API: `cache.get()`, `cache.set()`, `cache.delete()`, `cache.wrap()` (get-or-compute with TTL).
3. **Safe invalidation** — Every cache key must have a predictable prefix. Mutating API routes must invalidate related keys after DB writes succeed.
4. **Graceful degradation** — If Redis is down, cache silently fails, reads fall back to DB, writes continue without caching. Never hard-crash the app on Redis unavailability.
5. **Tagged invalidation** — Support tagging keys (e.g., `"users"`, `"tasks"`, `"sessions"`) so bulk invalidation is possible: `cache.invalidateTag("users")` flushes all user-related keys.
6. **Feature-flag ready** — After feature flags system exists, wrap all cache calls in `isFeatureEnabled("performance.caching")`. When disabled, `cache.wrap()` bypasses Redis and calls the compute function directly.
7. **Never cache non-deterministic or security-sensitive data without expiration** — e.g., don't cache auth tokens; do cache user profiles with short TTL.

## Environment Variables

```bash
# Required if caching is enabled (default: disabled if not set)
REDIS_URL=redis://localhost:6379       # Standard Redis URL
# OR
REDIS_URL=rediss://...                # TLS Redis
# OR for Upstash
UPSTASH_REDIS_REST_URL=https://...     # Upstash REST API URL
UPSTASH_REDIS_REST_TOKEN=...           # Upstash REST API token
```

If neither `REDIS_URL` nor `UPSTASH_REDIS_REST_URL` is set, the cache module runs in **pass-through mode** (no-op, always falls back to DB).

## Schema Changes

No schema changes. Pure library addition.

## Core Library

### `src/lib/cache.ts`

```ts
import { Redis } from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";

type CacheDriver = "upstash" | "redis" | "memory" | "none";

interface CacheConfig {
  driver: CacheDriver;
  prefix: string;
  defaultTtl: number; // seconds
}

class VellumCache {
  private driver: CacheDriver;
  private prefix: string;
  private defaultTtl: number;
  private redis?: Redis;
  private upstash?: UpstashRedis;
  private memory = new Map<string, { value: string; expiresAt: number }>();

  constructor(config: CacheConfig) {
    this.driver = config.driver;
    this.prefix = config.prefix;
    this.defaultTtl = config.defaultTtl;
  }

  async get<T>(key: string): Promise<T | null> {
    // Returns parsed JSON or null if miss / error
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    // Serializes and stores
  }

  async delete(key: string): Promise<void> {}

  async wrap<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    // get → if miss → fn() → set → return
  }

  async invalidateTag(tag: string): Promise<void> {
    // Deletes all keys with the given tag in their metadata
  }

  private buildKey(key: string): string {
    return `${this.prefix}:${key}`;
  }
}

let cacheInstance: VellumCache | null = null;

export function getCache(): VellumCache {
  if (!cacheInstance) {
    cacheInstance = createCacheFromEnv();
  }
  return cacheInstance;
}

export const cache = getCache();

function createCacheFromEnv(): VellumCache {
  // Detects Upstash tokens → Upstash driver
  // Detects REDIS_URL → Redis driver
  // Fallback → "none" (pass-through)
}
```

**Key decisions:**
- `cache.wrap()` is the primary API — reads cache, falls back to DB/compute, backfills cache automatically.
- Tag-based invalidation uses a Redis Set per tag that stores all keys tagged with it. On `invalidateTag`, we `SMEMBERS` then `DEL`.
- Pass-through mode when no Redis is configured: `get()` always returns `null`, `set()` is a no-op. App runs identically without caching.

## Usage Patterns

### Pattern A: Wrap a DB query

```ts
import { cache } from "@/lib/cache";

// In an API route or server component
const user = await cache.wrap(
  `user:${userId}`,
  () => db.select().from(users).where(eq(users.id, userId)).limit(1),
  60 // TTL: 60 seconds
);
```

### Pattern B: Invalidate on mutation

```ts
// After updating a user
await db.update(users).set(data).where(eq(users.id, userId));
await cache.delete(`user:${userId}`);
await cache.invalidateTag("users");
```

### Pattern C: Tagged wrap for bulk invalidation

```ts
const tasks = await cache.wrap(
  `project-tasks:${projectId}`,
  () => db.select().from(tasks).where(eq(tasks.projectId, projectId)),
  30,
  { tags: ["tasks", `project:${projectId}`] }
);

// After creating/editing/deleting any task
await cache.invalidateTag("tasks");
```

### Pattern D: Session cache (short TTL)

```ts
const session = await cache.wrap(
  `session:${sessionId}`,
  () => db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1),
  300 // 5 minute TTL, sessions are short-lived
);
```

## Integration Points (apply caching)

| Location | What to cache | TTL | Invalidation trigger |
|----------|--------------|-----|---------------------|
| `getSession()` | Session lookup by session cookie | 5 min | On logout, on session revoke |
| `getProject()` | Project details | 1 min | On project update/delete |
| Task list endpoints | Project task lists | 30 sec | On task CRUD |
| User profile lookups | User name/avatar/role | 2 min | On user update |
| Superadmin stats | Dashboard counts | 30 sec | Periodic background refresh |
| Feature flags | `isFeatureEnabled()` | 60 sec | On flag update (already built-in) |
| Notification preferences | Per-user prefs | 5 min | On preference update |
| Activity logs | Recent logs | 30 sec | On new log entry |

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/cache.ts` | Core cache singleton with driver detection, wrap, tags |
| `src/lib/cache-keys.ts` | Centralized cache key builders (avoid magic strings) |
| `src/app/api/super-admin/cache/flush/route.ts` | Superadmin endpoint to flush all or tagged keys |

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/auth.ts` | `getSession()`: add `cache.wrap()` around DB lookup, invalidate on logout/revoke |
| `src/lib/feature-flags.ts` | After feature flags exist: wrap `getAllFlags()` in `cache.wrap()` instead of manual Map |
| `src/lib/notifications.ts` | Cache notification preferences per user |
| `src/app/api/tasks/route.ts` | Invalidate task caches on mutation |
| `src/app/api/tasks/[id]/route.ts` | Invalidate task caches on mutation |
| `src/app/api/projects/[id]/route.ts` | Invalidate project caches on mutation |
| `src/app/api/users/[id]/route.ts` | Invalidate user caches on mutation |
| `src/app/api/super-admin/*` stats routes | Wrap expensive aggregation queries |
| `.env.example` | Add Redis env vars |
| `AGENTS.md` | Document: "use `cache.wrap()` for repeated DB reads, invalidate on mutation" |
| `STRUCTURE.md` | Add new files |

## Feature Flag Integration (Phase 2)

After `TODO/feature-flags.md` is shipped:

1. Add default flag: `performance.caching` (default: `true`)
2. In `getCache()`, check `isFeatureEnabled("performance.caching")`. If disabled, return a no-op driver.
3. Mark caching task as partially done; add sub-task: "Gate caching behind feature flag once feature flags system exists".

## Migration Strategy

1. Add `@upstash/redis` and `ioredis` as optional peer deps (or just install both)
2. Build `src/lib/cache.ts` and `src/lib/cache-keys.ts`
3. Add env vars to `.env.example`
4. Integrate `cache.wrap()` into `getSession()` as the pilot
5. Monitor for cache hit rate and stale data
6. Roll out to project/task/user lookups
7. Add superadmin flush endpoint
8. Lint, typecheck, build → ship
9. **After feature flags exist**: add flag gate, mark task complete

## Acceptance Criteria

- [ ] `src/lib/cache.ts` supports Upstash, Redis, and pass-through modes
- [ ] `cache.wrap()` works for any async function with configurable TTL
- [ ] `cache.invalidateTag()` bulk-invalidates tagged keys
- [ ] `getSession()` uses cache with 5-min TTL and invalidates on logout
- [ ] Cache is pass-through when no Redis env vars are set (app works identically)
- [ ] Cache silently handles Redis disconnection (graceful degradation)
- [ ] Superadmin can flush all cache or by tag via API
- [ ] `bun run lint`, `bun run typecheck`, `bun run build` all pass
- [ ] Phase 2: cache is gated by `performance.caching` feature flag (TBD after feature flags system)
