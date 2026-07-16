#!/usr/bin/env -S deno run -A
/**
 * Compare Deno Deploy edge region vs Prisma Postgres host latency.
 *
 * Usage:
 *   deno run -A scripts/check-db-colocation.ts
 *   APP_URL=https://vellum.sofehaus.deno.net deno run -A scripts/check-db-colocation.ts
 *
 * Needs DATABASE_URL (local .env or exported). Measures TCP+TLS to PGHOST
 * and HTTP to the Deploy app health endpoint. If PG RTT >> app edge RTT,
 * regions are mismatched — move Prisma DB next to Deploy (or vice versa).
 */
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

try {
  await load({ export: true, allowEmptyValues: true });
} catch {
  // .env optional when DATABASE_URL already set
}

const appUrl = (Deno.env.get("APP_URL") ?? "https://vellum.sofehaus.deno.net").replace(
  /\/$/,
  "",
);
const databaseUrl = Deno.env.get("DATABASE_URL");

function parsePgHost(url: string): { host: string; port: number } {
  const u = new URL(url);
  return { host: u.hostname, port: Number(u.port || 5432) };
}

async function timeHealth(): Promise<{ ms: number; via: string | null }> {
  const t0 = performance.now();
  const res = await fetch(`${appUrl}/api/health`);
  const ms = Math.round(performance.now() - t0);
  await res.text();
  return { ms, via: res.headers.get("via") };
}

async function timeTcpTls(host: string, port: number): Promise<number> {
  const t0 = performance.now();
  const conn = await Deno.connectTls({ hostname: host, port });
  const ms = Math.round(performance.now() - t0);
  conn.close();
  return ms;
}

console.log(`App: ${appUrl}`);
const samples: number[] = [];
let via: string | null = null;
for (let i = 0; i < 3; i++) {
  const r = await timeHealth();
  samples.push(r.ms);
  via = r.via;
  console.log(`  health #${i + 1}: ${r.ms}ms`);
}
console.log(`  via: ${via ?? "(none)"}`);
console.log(`  health avg: ${Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)}ms`);
console.log(
  "  note: health = edge + Deno isolate + 1x DB round-trip. Warm ~500ms ⇒ DB far from ORD.",
);

if (!databaseUrl) {
  console.log("\nDATABASE_URL missing — skip direct PG probe.");
  console.log("Fix: set DATABASE_URL to prod (or Prisma dashboard region), then re-run.");
  console.log("Colocate: `deno deploy database provision … --region <same-as-app>`");
  Deno.exit(0);
}

const { host, port } = parsePgHost(databaseUrl);
console.log(`\nPG host: ${host}:${port}`);
const pgSamples: number[] = [];
for (let i = 0; i < 3; i++) {
  try {
    const ms = await timeTcpTls(host, port);
    pgSamples.push(ms);
    console.log(`  tcp+tls #${i + 1}: ${ms}ms`);
  } catch (e) {
    console.log(`  tcp+tls #${i + 1}: FAIL ${e}`);
  }
}
if (pgSamples.length) {
  const avg = Math.round(pgSamples.reduce((a, b) => a + b, 0) / pgSamples.length);
  console.log(`  tcp+tls avg: ${avg}ms`);
  if (avg > 80) {
    console.log("  → PG far from this machine. Check Prisma region vs Deno Deploy ORD.");
  } else {
    console.log("  → PG near this machine (not proof of Deploy colocation).");
  }
}
