# Self-Hosted Installation Docs & Quick Install Script

> **Priority:** Medium
> **Status:** Pending
> **Estimated complexity:** Medium
> **Depends on:** Nothing
> **Blocks:** None

---

## Overview

Currently the project only has developer onboarding docs (clone repo, install deps, run dev). There's no guide for end-users who want to deploy Vellum on their own server or local machine in production mode.

We need:
1. A comprehensive **self-hosted installation guide** (local dev, local production, server production)
2. An **interactive quick-install shell script** that automates setup
3. Support for both Docker and bare-metal deployments
4. Optional Nginx reverse proxy configuration
5. Environment variable explanation for all deployment modes

## Target Scenarios

| Scenario | User | Stack | Guide Section |
|----------|------|-------|---------------|
| Local dev | Developer | Bun + Neon DB | Already covered in README |
| Local production | Power user | Bun + Docker Postgres | New |
| Server (Docker) | Sysadmin | Docker Compose | New |
| Server (bare metal) | Sysadmin | Bun + systemd + Nginx | New |
| Server (Vercel) | User | Vercel + Neon | Already covered, but needs refinement |

## Documentation Structure

### `docs/INSTALL.md`

```
# Installing Vellum

## Quick Start (Docker Compose)
One-liner that spins up everything:
```bash
curl -fsSL https://vellum.dev/install.sh | bash
```

## Manual Installation

### Prerequisites
- Node.js 20+ or Bun 1.2+
- PostgreSQL 15+
- (Optional) Redis 7+ for caching
- (Optional) Nginx for reverse proxy

### Step 1: Database Setup
### Step 2: Environment Configuration
### Step 3: Application Setup
### Step 4: Reverse Proxy (optional)
### Step 5: SSL with Let's Encrypt (optional)

## Docker Compose
Full docker-compose.yml reference

## Environment Variables Reference
Complete table of all env vars, defaults, and which are required

## Updating
How to update to a new Vellum version

## Troubleshooting
Common issues and solutions
```

## Quick Install Script

### `scripts/install.sh`

Interactive shell script that:

1. Detects OS (Linux/macOS/WSL)
2. Checks for prerequisites (Node/Bun, Git)
3. Prompts for:
   - Deployment mode (Docker / bare metal)
   - Database location (local Docker / external Postgres / Neon)
   - Whether to install Nginx
   - Whether to set up SSL (Let's Encrypt)
   - Admin account details (seed setup)
4. Generates:
   - `.env` file with appropriate values
   - `docker-compose.yml` (if Docker mode)
   - `nginx.conf` (if Nginx mode)
   - systemd service file (if bare metal mode)
5. Runs database migrations
6. Seeds default data
7. Starts the application
8. Prints next steps and access URL

### `scripts/install.ps1` (Windows)

PowerShell equivalent for Windows Server / WSL2 users.

### `scripts/update.sh`

Update script that:
1. Pulls latest code
2. Runs migrations
3. Restarts services
4. Backs up before updating (optional)

## Files to Create

| File | Purpose |
|------|---------|
| `docs/INSTALL.md` | Full installation guide |
| `scripts/install.sh` | Interactive quick-install (Unix) |
| `scripts/install.ps1` | Interactive quick-install (Windows) |
| `scripts/update.sh` | Update script |
| `scripts/docker-compose.template.yml` | Docker Compose template used by install script |
| `scripts/nginx.template.conf` | Nginx config template |
| `scripts/vellum.service.template` | systemd service template |

## Files to Modify

| File | Change |
|------|--------|
| `README.md` | Add "Self-Hosted Installation" section linking to docs/INSTALL.md |
| `.env.example` | Ensure all production-relevant vars are documented with comments |
| `AGENTS.md` | Document install script conventions |
| `STRUCTURE.md` | Add docs/ and scripts/ entries |

## Acceptance Criteria

- [ ] `docs/INSTALL.md` covers all 4 deployment scenarios with clear steps
- [ ] `scripts/install.sh` is interactive, guides user through choices, generates configs
- [ ] Script works on Ubuntu 22.04+ and macOS 14+ without modification
- [ ] Docker Compose setup works with one command (`docker compose up`)
- [ ] Bare metal setup produces a working systemd service
- [ ] All env vars documented with descriptions, defaults, and required/optional status
- [ ] Update script handles migrations and graceful restarts
- [ ] README.md links prominently to install guide

## Notes

- Keep the script simple — no complex templating engines, just `sed` and `cat <<EOF`
- Default to Docker Compose for easiest path
- Don't hardcode paths — use variables the user can override
- Include health check in docker-compose.yml
- Consider adding a `--non-interactive` flag for CI/automation
