# API Tokens

> **Priority:** High
> **Status:** Pending
> **Estimated complexity:** Large
> **Depends on:** Nothing
> **Blocks:** Nothing

---

## Overview

Allow all authenticated users to create personal API tokens that grant the same permissions as their account. Tokens enable external integrations — scripts, CI/CD pipelines, bots, third-party apps — to interact with Vellum's API. Each token is scoped to the creating user's permissions and can be named, revoked, and tracked.

Provide comprehensive API documentation via OpenAPI/Swagger and exportable Postman collections so developers can quickly integrate with Vellum.

## Current State

- All API routes use session-based auth via `getSession()` (cookie: `tf_session`)
- No token-based auth exists
- No API documentation or OpenAPI spec
- No user-facing token management

## Design Principles

1. **Secure** — tokens are hashed (bcrypt), shown once on creation, prefixed for identification
2. **Scoped** — tokens inherit the creating user's exact permissions (role-based)
3. **Auditable** — last used timestamp, can be revoked instantly
4. **Developer-friendly** — Swagger UI, Postman export, clear docs

## Database Changes

### New table: `api_tokens`

```ts
export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  prefix: text("prefix").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Key design decisions:**
- `tokenHash`: bcrypt hash of the full token — never store plaintext
- `prefix`: first 8 chars of the random part (e.g. `a1b2c3d4`) — shown in UI so users can identify tokens without the full secret
- `expiresAt`: optional — tokens can be permanent or have a TTL
- `lastUsedAt`: updated on each authenticated request (throttled to avoid write contention)

## Token Format

```
vellum_<16-char-hex>
```

Example: `vellum_a1b2c3d4e5f67890`

- `vellum_` prefix identifies Vellum tokens
- 16 hex chars = 64 bits of entropy (collision-resistant)
- Full token shown only once (on creation response)
- UI shows only `vellum_a1b2c3d4...` (truncated)

## Auth Middleware

### `src/lib/api-auth.ts`

```ts
export async function getTokenUser(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer vellum_")) return null;

  const token = authHeader.slice(7); // "vellum_..."
  const prefix = token.slice(8, 16); // first 8 hex chars after "vellum_"

  // Find token by prefix (fast lookup), then verify hash
  const [tokenRow] = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.prefix, prefix))
    .limit(1);

  if (!tokenRow) return null;

  const valid = await bcrypt.compare(token, tokenRow.tokenHash);
  if (!valid) return null;

  // Check expiry
  if (tokenRow.expiresAt && tokenRow.expiresAt < new Date()) return null;

  // Update lastUsedAt (throttled — only if >5min since last update)
  if (!tokenRow.lastUsedAt || Date.now() - tokenRow.lastUsedAt.getTime() > 300_000) {
    await db
      .update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, tokenRow.id));
  }

  // Load user with permissions (same as getSession)
  const user = await loadUserWithPermissions(tokenRow.userId);
  return user;
}
```

### Integration with existing auth

Update `getSession()` to also check for Bearer token:

```ts
export async function getSession(req?: NextRequest): Promise<AuthUser | null> {
  // 1. Try cookie auth (existing)
  const cookieUser = await getCookieUser();
  if (cookieUser) return cookieUser;

  // 2. Try token auth (new)
  if (req) {
    const tokenUser = await getTokenUser(req);
    if (tokenUser) return tokenUser;
  }

  return null;
}
```

Or: keep them separate and have API routes call `getTokenUser()` as a fallback. The cleaner approach is to make `getSession()` check both.

## API Routes

### User-facing: `/api/tokens`

**`GET /api/tokens`** — List current user's tokens
```json
{
  "tokens": [
    {
      "id": "uuid",
      "name": "CI Pipeline",
      "prefix": "a1b2c3d4",
      "lastUsedAt": "2026-07-17T...",
      "expiresAt": null,
      "createdAt": "2026-07-01T..."
    }
  ]
}
```

**`POST /api/tokens`** — Create a new token
```json
// Request
{ "name": "CI Pipeline", "expiresInDays": 90 }

// Response (full token shown ONCE)
{
  "token": "vellum_a1b2c3d4e5f67890abcd",
  "tokenInfo": {
    "id": "uuid",
    "name": "CI Pipeline",
    "prefix": "a1b2c3d4",
    "expiresAt": "2026-10-15T..."
  }
}
```

**`DELETE /api/tokens/[id]`** — Revoke a token
- Only the token owner can revoke
- Returns `{ success: true }`

### Public: `/api/docs`

OpenAPI 3.0 JSON spec describing all public and authenticated endpoints.

### Public: `/api/docs/postman`

Returns a Postman Collection v2.1 JSON file.

## UI Changes

### User Settings — API Tokens Section

New section in `/dashboard/settings`:

- **Create token form**: name input, optional expiry dropdown (30d, 90d, 1y, never)
- **Token list**: table with name, prefix (truncated), last used, created, actions (revoke)
- **Reveal once**: after creation, show full token in a copyable alert with warning: "Copy this now — it won't be shown again"
- **Revoke confirmation**: "Revoke token 'CI Pipeline'? Any scripts using it will stop working."

## OpenAPI Spec

Generate an OpenAPI 3.0 spec covering:

- All API routes (tasks, projects, comments, teams, users, super-admin)
- Authentication: Bearer token + session cookie
- Request/response schemas
- Error responses

Serve at `GET /api/docs` as JSON. Optionally embed Swagger UI at `/docs` page.

## Postman Collection

Generate a Postman Collection v2.1 from the same route definitions:

- Groups by resource (Tasks, Projects, Comments, etc.)
- Pre-configured auth headers
- Example requests for each endpoint
- Available at `GET /api/docs/postman` for download

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/api-auth.ts` | Token auth helper: `getTokenUser()` |
| `src/app/api/tokens/route.ts` | GET list, POST create |
| `src/app/api/tokens/[id]/route.ts` | DELETE revoke |
| `src/app/api/docs/route.ts` | OpenAPI spec JSON |
| `src/app/api/docs/postman/route.ts` | Postman collection JSON |
| `src/app/dashboard/settings/ApiTokensSection.tsx` | Token management UI |
| `src/app/dashboard/settings/page.tsx` | Add ApiTokensSection (modify) |
| `src/lib/openapi.ts` | OpenAPI spec builder |
| `src/lib/postman.ts` | Postman collection builder |

## Files to Modify

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `apiTokens` table |
| `src/lib/auth.ts` | Update `getSession()` to check Bearer token |
| `src/middleware.ts` | Optionally: skip CSRF for Bearer-authed requests |
| `AGENTS.md` | Document token auth pattern for agents |
| `STRUCTURE.md` | Add new files |
| `TODO.md` | Move to DONE |
| `DONE.md` | Add entry |

## Migration Strategy

1. Create `api_tokens` table + migration
2. Build `src/lib/api-auth.ts` with `getTokenUser()`
3. Update `getSession()` to check Bearer token fallback
4. Build token CRUD API routes
5. Build OpenAPI spec generator
6. Build Postman collection generator
7. Build API docs UI page (optional: Swagger UI embed)
8. Build ApiTokensSection in user settings
9. Update all existing API routes to work with token auth
10. Update AGENTS.md with token auth convention
11. Update STRUCTURE.md, TODO.md, DONE.md
12. Lint, typecheck, build

## Acceptance Criteria

- [ ] `api_tokens` table exists with proper schema
- [ ] `getTokenUser()` authenticates via Bearer token
- [ ] `getSession()` falls back to token auth when no cookie
- [ ] Users can create named tokens via settings UI
- [ ] Full token shown once on creation, then only prefix visible
- [ ] Users can revoke their own tokens
- [ ] Tokens that are expired or revoked are rejected
- [ ] `lastUsedAt` updated on each use (throttled)
- [ ] `GET /api/docs` returns valid OpenAPI 3.0 spec
- [ ] `GET /api/docs/postman` returns valid Postman collection
- [ ] Swagger UI accessible at `/docs` (optional page)
- [ ] All API routes work with both cookie and token auth
- [ ] AGENTS.md documents the token auth pattern
- [ ] `bun run lint`, `bun run typecheck`, `bun run build` all pass
