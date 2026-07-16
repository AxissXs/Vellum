#!/usr/bin/env bash
# Deno Deploy Next.js: cwd=/app/src; artifact only has .next/standalone/
set -euo pipefail
echo "[predeploy] pwd=$(pwd)"
candidates=(
  "/app/.next/standalone/migrate.ts"
  "$(pwd)/../.next/standalone/migrate.ts"
  ".next/standalone/migrate.ts"
)
for f in "${candidates[@]}"; do
  if [[ -f "$f" ]]; then
    echo "[predeploy] running $f"
    exec deno run -A "$f"
  fi
done
echo "[predeploy] missing migrate.ts"
find /app/.next -name 'migrate.ts' 2>/dev/null | head -20 || true
ls -la /app/.next/standalone 2>/dev/null | head -30 || true
exit 1
