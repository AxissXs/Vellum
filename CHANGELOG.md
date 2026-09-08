# Changelog

All notable changes to Vellum will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [1.12.0] - 2026-09-08

### Added
- API visibility enforcement on all project and task endpoints (`src/lib/project-access.ts`)
- Task and project search endpoints (`GET /api/tasks/search`, `GET /api/projects/search`)
- Agent search endpoints (`GET /api/agent/tasks/search`, `GET /api/agent/projects/search`)
- Full task CRUD for agent endpoints (create, update, delete)
- API documentation links in Settings page (`/docs/api`, `/docs/agents`)
- Bearer token auth documented in AGENTS.md

### Fixed
- Single-project endpoints (`GET/PATCH/DELETE /api/projects/[id]`) now enforce full company/team/private visibility
- Milestones routes check parent project access
- Agent endpoints filter by project visibility
- Agent comment endpoint rejects deleted tasks
- Task routes join projects table and enforce visibility
- `withAuth`/`withRole` HOFs upgraded to generics for Next.js params type safety

### Changed
- Version bump to 1.12.0

## [1.11.2] - 2026-09-08

### Fixed
- JSX escape error in agents docs page (`/docs/agents`)
- Missing `actorType` on `AuditLogItem` and `AuditLogDetail` types

### Changed
- Version bump to 1.11.2

## [1.11.1] - 2026-09-08

### Added
- Centralized auth HOF wrappers (`withAuth`, `withRole`) in `src/lib/hofs.ts`
- Client-side 401 redirect to `/login` in `src/lib/api.ts`
- Session cookie clearing on auth failure (`unauthorizedResponse()`, `clearSessionCookie()`)

### Fixed
- Revoked sessions no longer have access to any protected routes
- Stale session cookies are cleared immediately on 401

### Changed
- Refactored 5 representative routes to use HOF wrappers (notifications, projects, super-admin/users, sessions/me, auth/logout)
- Version bump to 1.11.1

## [1.11.0] - 2026-09-08

### Added
- API token authentication (`Authorization: Bearer vellum_...`)
- `api_tokens` table with bcrypt-hashed tokens, prefix identification, optional expiry
- Token CRUD endpoints (`GET/POST /api/tokens`, `DELETE /api/tokens/[id]`)
- Agent endpoints (`/api/agent/tasks`, `/api/agent/tasks/:id/claim|status|comment`, `/api/agent/projects`)
- Activity attribution (`actorType: "user" | "agent"`)
- OpenAPI 3.0 spec at `GET /api/docs`
- Postman collection at `GET /api/docs/postman`
- API reference page at `/docs/api`
- Agent integration guide at `/docs/agents`
- API token management UI in Settings
- Self-service password change (`POST /api/auth/change-password`)
- Multi-team project assignment via `project_teams` junction table
- Team-scoped project visibility
- Project visibility enforcement (company/team/private)

### Changed
- Version bump to 1.11.0

## [1.8.0] - 2026-09-08

### Added
- Feature flags system (Phase 1): DB table, `isFeatureEnabled()` helper, superadmin UI, seed defaults
- User last-seen tracking (throttled, fire-and-forget)
- Dark/light theme system with semantic tokens
- Kanban cross-column drag-and-drop fix

### Changed
- Version bump to 1.8.0
