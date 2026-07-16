#!/usr/bin/env bash
# Backup Deno Deploy / Prisma Postgres (production) for later migrate.
#
# Usage:
#   export PROD_DATABASE_URL='postgres://USER:PASS@db.prisma.io:5432/postgres?sslmode=require'
#   ./scripts/backup-prod-db.sh
#
# Prefer the *direct* connection string (db.prisma.io), not pooled.
# Get it: Deno Deploy → Databases → vellum-pg → 519140-production → copy DATABASE_URL
#   or claim + Prisma Console → Connect → direct URL
#
# Output: backups/vellum-pg-ap-southeast-1-519140-production-YYYYmmdd-HHMMSS.dump

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/backups"
mkdir -p "$OUT_DIR"

if [[ -z "${PROD_DATABASE_URL:-}" ]]; then
  echo "Set PROD_DATABASE_URL to the direct Prisma/Deno production connection string."
  echo "Example:"
  echo "  export PROD_DATABASE_URL='postgres://...@db.prisma.io:5432/...?sslmode=require'"
  echo "  ./scripts/backup-prod-db.sh"
  exit 1
fi

# Prefer newer pg_dump if available (Prisma Postgres ~17).
PG_DUMP="${PG_DUMP:-}"
if [[ -z "$PG_DUMP" ]]; then
  for c in \
    /Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump \
    /opt/homebrew/opt/postgresql@17/bin/pg_dump \
    /usr/local/opt/postgresql@17/bin/pg_dump \
    "$(command -v pg_dump)"
  do
    if [[ -x "$c" ]]; then PG_DUMP="$c"; break; fi
  done
fi

if [[ -z "${PG_DUMP}" || ! -x "$PG_DUMP" ]]; then
  echo "pg_dump not found. Install Postgres client tools (v17 preferred)."
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT_DIR}/vellum-pg-ap-southeast-1-519140-production-${STAMP}.dump"
META="${OUT%.dump}.txt"

echo "pg_dump: $($PG_DUMP --version)"
echo "target:  $OUT"

# sanity: can connect + count users (no password echo)
psql_bin="$(dirname "$PG_DUMP")/psql"
if [[ -x "$psql_bin" ]]; then
  echo "probe:"
  "$psql_bin" "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
    "select current_database() as db, count(*)::int as users from users;"
fi

"$PG_DUMP" \
  --format=custom \
  --verbose \
  --no-owner \
  --no-acl \
  --dbname="$PROD_DATABASE_URL" \
  --file="$OUT"

{
  echo "created_at=$STAMP"
  echo "source=vellum-pg / 519140-production / ap-southeast-1"
  echo "pg_dump=$($PG_DUMP --version)"
  echo "bytes=$(wc -c < "$OUT" | tr -d ' ')"
  echo "sha256=$(shasum -a 256 "$OUT" | awk '{print $1}')"
} | tee "$META"

echo
echo "OK backup ready."
echo "  dump: $OUT"
echo "  meta: $META"
echo
echo "Next (after you verify dump size > 0):"
echo "  1) Detach:  deno deploy database detach vellum-pg --app vellum --org sofehaus"
echo "  2) Delete:  deno deploy database delete vellum-pg --org sofehaus"
echo "  3) Provision us-east-1:"
echo "     deno deploy database provision vellum-pg --kind prisma --region us-east-1 --org sofehaus"
echo "  4) Assign:  deno deploy database assign vellum-pg --app vellum --org sofehaus"
echo "  5) Later restore into new prod URL:"
echo "     pg_restore --no-owner --no-acl -d \"\$NEW_DATABASE_URL\" \"$OUT\""
