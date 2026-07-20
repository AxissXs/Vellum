# VSCode Extension

> **Priority:** Low (long-term)
> **Status:** Pending
> **Estimated complexity:** Very Large
> **Depends on:** API tokens (`TODO/api-tokens.md`)
> **Blocks:** None

---

## Overview

Build a Visual Studio Code extension that integrates with Vellum, allowing developers to track their workload, manage tasks, and time-track without leaving their editor. The extension authenticates via API tokens (OAuth-style flow or manual token paste) and exposes a sidebar panel with assigned tasks, timers, and work activity analytics.

This is a **separate project/sub-repo** within the Vellum organization — it does not live in the main web app repo. However, it depends on the main app's API token system for authentication.

## Design Principles

1. **Privacy-first** — All data belongs to the user. The extension only sends data the user explicitly authorizes.
2. **Non-judgmental** — Work time / idle time tracking must not be used for punitive performance evaluation. It's a self-awareness tool.
3. **Low overhead** — The extension must not slow down VSCode. Activity tracking should be lightweight.
4. **Revocable** — Users can disconnect the extension at any time from their Vellum account settings.

## Features (Phase 1 — MVP)

### Authentication
- Opens Vellum login page in browser
- User authorizes the extension (OAuth-style token exchange)
- Extension stores API token securely (VSCode SecretStorage)
- Token can be revoked from Vellum Settings → Connected Apps

### Sidebar Panel: My Tasks
- Lists tasks assigned to the logged-in user
- Filters: All / In Progress / Done / Overdue
- Click to view task details (title, description, project, due date)
- "Start Timer" button on each task
- Shows time tracked per task (today / this week)

### Activity Timer
- "Start Work" / "Pause" / "Finish" buttons
- Timer runs in status bar (minimal, unobtrusive)
- Tracks: total time, active time, idle time
- Idle detection: if no keystrokes / mouse movement in VSCode for 5+ minutes, mark as idle
- On "Finish", logs the session to Vellum API:
  ```json
  {
    "taskId": "...",
    "startedAt": "...",
    "endedAt": "...",
    "totalSeconds": 3600,
    "activeSeconds": 2800,
    "idleSeconds": 800
  }
  ```

### Status Bar
- Shows current task + elapsed time when timer is running
- Icon changes color when idle

## Features (Phase 2 — Later)

### Work Activity Analytics
- Weekly summary: hours worked, tasks completed, average focus time
- Trends over time (not for management, for self-reflection)
- "Focus sessions" — Pomodoro-style blocks

### Code Context Integration
- Optionally link timer sessions to git commits
- Detect when user is working on files related to a task (based on project path matching)
- Suggest starting timer when editing files in a project with open tasks

### Quick Commands
- `Ctrl+Shift+V T` — Toggle timer
- `Ctrl+Shift+V S` — Show my tasks
- `Ctrl+Shift+V R` — Report today's work

### Notifications
- Desktop notification when timer hits a milestone (e.g., 25 min Pomodoro done)
- Gentle reminder if idle for too long: "Still working on X?"

## Architecture

```
vscode-vellum/
├── src/
│   ├── extension.ts          # Entry point: activation, disposal
│   ├── auth/
│   │   ├── authManager.ts    # Token storage, refresh, logout
│   │   └── loginFlow.ts      # Browser redirect + callback handler
│   ├── api/
│   │   └── vellumClient.ts   # Typed API client using stored token
│   ├── panels/
│   │   └── tasksPanel.ts     # TreeDataProvider for task list sidebar
│   ├── timer/
│   │   ├── timerService.ts   # Core timer logic (start/pause/finish)
│   │   ├── idleDetector.ts   # Keystroke/mouse idle detection
│   │   └── statusBar.ts      # Status bar UI
│   └── commands/
│       └── index.ts          # All command registrations
├── package.json              # Extension manifest, contributes, activation events
├── tsconfig.json
└── README.md
```

## Authentication Flow

1. User runs "Vellum: Connect Account" command
2. Extension opens browser to `https://vellum.app/connect?vscode=true&state=random`
3. User logs into Vellum web app
4. Vellum shows "Authorize VSCode Extension?" page with scopes (read tasks, write time logs)
5. User clicks "Authorize"
6. Vellum redirects to `vscode://vellum.extension/callback?token=api_token_xyz`
7. VSCode intercepts the URI, extension extracts and securely stores the token

## API Dependencies (in main Vellum app)

Before building the extension, the main app needs:

1. **API tokens system** (`TODO/api-tokens.md`) — Users create scoped tokens for the extension
2. **Connected apps management** — New section in user settings:
   - Shows connected apps (VSCode Extension, future integrations)
   - Revoke button per app
   - Last used timestamp
   - Scopes granted
3. **Time tracking API** — `POST /api/time-entries` (or integrate with existing milestones/tasks)

## Connected Apps Schema (in main Vellum app DB)

```ts
export const connectedApps = pgTable("connected_apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),        // e.g. "VSCode Extension"
  appId: text("app_id").notNull(),     // e.g. "vscode-vellum"
  tokenId: uuid("token_id").references(() => apiTokens.id, { onDelete: "cascade" }),
  scopes: text("scopes").array().notNull().default([]),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## Files to Create (in extension repo)

| File | Purpose |
|------|---------|
| `vscode-vellum/src/extension.ts` | Entry point |
| `vscode-vellum/src/auth/authManager.ts` | Secure token storage |
| `vscode-vellum/src/auth/loginFlow.ts` | Browser OAuth flow |
| `vscode-vellum/src/api/vellumClient.ts` | API client with token auth |
| `vscode-vellum/src/panels/tasksPanel.ts` | Sidebar tree view |
| `vscode-vellum/src/timer/timerService.ts` | Core timer |
| `vscode-vellum/src/timer/idleDetector.ts` | Activity detection |
| `vscode-vellum/src/timer/statusBar.ts` | Status bar widget |
| `vscode-vellum/src/commands/index.ts` | Command palette entries |

## Files to Modify (in main Vellum app)

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `connectedApps` table |
| `src/app/dashboard/settings/page.tsx` | Add "Connected Apps" section |
| `src/app/api/connected-apps/route.ts` | List user's connected apps |
| `src/app/api/connected-apps/[id]/route.ts` | Revoke/delete connected app |
| `AGENTS.md` | Document: "Future integrations use API tokens + connected apps" |

## Acceptance Criteria

### Phase 1 (MVP)
- [ ] Extension published to VSCode Marketplace
- [ ] User can authenticate via browser OAuth flow
- [ ] Sidebar shows assigned tasks from Vellum
- [ ] Timer with start/pause/finish works and logs to Vellum
- [ ] Idle detection is accurate but not invasive
- [ ] User can revoke extension from Vellum web settings
- [ ] Token is stored securely (VSCode SecretStorage)

### Phase 2 (Analytics)
- [ ] Weekly work summary visible in extension panel
- [ ] Focus session / Pomodoro mode
- [ ] Git commit linking (optional)
- [ ] Desktop notifications for milestones

### Main App Prerequisites
- [ ] API tokens system shipped (`TODO/api-tokens.md`)
- [ ] `connectedApps` table exists
- [ ] Settings page has "Connected Apps" section with revoke
- [ ] `POST /api/time-entries` or equivalent API exists

## Notes

- This task is a **placeholder/reminder** — the extension should be a separate repository (`AxissXs/vscode-vellum`)
- The extension repo can be created once API tokens are available
- Idle detection algorithm must be fair — don't penalize thinking time, reading docs, or reviewing code
- Consider local-first storage: if offline, queue time entries and sync when connection returns
- The extension icon should match Vellum branding
