import {
  getPlatformSetting,
  setPlatformSetting,
} from "@/lib/platform-settings";

/** Mac Mini Ollama/ngrok uptime is ops outside the app (e.g. launchd); this only probes. */

const HEALTH_KEY = "llm_interpret_health";
const THINK_KEY = "llm_interpret_think";
const DEFAULT_MODEL = "gemma4:e2b";
const PROBE_TIMEOUT_MS = 5_000;
const UNHEALTHY_TTL_MS = 10 * 60 * 1000;
const FAILURE_THRESHOLD = 3;

export type LlmHealthSource = "cron" | "probe" | "breaker";

export type LlmHealthSnapshot = {
  ok: boolean;
  checkedAt: string;
  latencyMs: number | null;
  model: string;
  error: string | null;
  consecutiveFailures: number;
  source: LlmHealthSource;
};

function interpretBaseUrl(): string {
  return (process.env.LLM_INTERPRET_URL || "").replace(/\/$/, "");
}

export function interpretModelName(): string {
  return process.env.LLM_INTERPRET_MODEL?.trim() || DEFAULT_MODEL;
}

export function isInterpretUrlConfigured(): boolean {
  return Boolean(process.env.LLM_INTERPRET_URL?.trim());
}

export function interpretRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
  };
  const secret = process.env.LLM_INTERPRET_SECRET?.trim();
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}

function parseHealth(raw: string | null): LlmHealthSnapshot | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<LlmHealthSnapshot>;
    if (typeof data.ok !== "boolean" || typeof data.checkedAt !== "string") {
      return null;
    }
    return {
      ok: data.ok,
      checkedAt: data.checkedAt,
      latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : null,
      model: typeof data.model === "string" ? data.model : interpretModelName(),
      error: typeof data.error === "string" ? data.error : null,
      consecutiveFailures:
        typeof data.consecutiveFailures === "number"
          ? data.consecutiveFailures
          : 0,
      source:
        data.source === "cron" ||
        data.source === "probe" ||
        data.source === "breaker"
          ? data.source
          : "probe",
    };
  } catch {
    return null;
  }
}

async function saveHealth(snapshot: LlmHealthSnapshot): Promise<void> {
  await setPlatformSetting(HEALTH_KEY, JSON.stringify(snapshot));
}

export async function getLlmHealth(): Promise<LlmHealthSnapshot | null> {
  return parseHealth(await getPlatformSetting(HEALTH_KEY));
}

/**
 * Gate for NL: fail-fast only when a recent probe/breaker marked unhealthy.
 * Stale/missing → allow one attempt (dead cron must not lock NL forever).
 */
export async function isLlmHealthyForNl(): Promise<boolean> {
  if (!isInterpretUrlConfigured()) return false;
  const health = await getLlmHealth();
  if (!health) return true;
  if (health.ok) return true;
  const age = Date.now() - Date.parse(health.checkedAt);
  if (Number.isNaN(age) || age > UNHEALTHY_TTL_MS) return true;
  return false;
}

export async function getInterpretThinkEnabled(): Promise<boolean> {
  const raw = await getPlatformSetting(THINK_KEY);
  if (raw === null || raw === undefined) return true;
  return raw !== "false";
}

export async function setInterpretThinkEnabled(enabled: boolean): Promise<void> {
  await setPlatformSetting(THINK_KEY, enabled ? "true" : "false");
}

function modelListed(
  models: Array<{ name?: string }> | undefined,
  wanted: string
): boolean {
  if (!models?.length) return false;
  return models.some((m) => {
    const name = m.name || "";
    return name === wanted || name.startsWith(`${wanted}:`) || name.startsWith(wanted);
  });
}

export async function probeLlmHealth(opts: {
  source: Exclude<LlmHealthSource, "breaker">;
}): Promise<LlmHealthSnapshot> {
  const model = interpretModelName();
  const prev = await getLlmHealth();
  const base = interpretBaseUrl();

  if (!base) {
    const snapshot: LlmHealthSnapshot = {
      ok: false,
      checkedAt: new Date().toISOString(),
      latencyMs: null,
      model,
      error: "not_configured",
      consecutiveFailures: (prev?.consecutiveFailures ?? 0) + 1,
      source: opts.source,
    };
    await saveHealth(snapshot);
    return snapshot;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const started = Date.now();

  try {
    const res = await fetch(`${base}/api/tags`, {
      method: "GET",
      headers: interpretRequestHeaders(),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const snapshot: LlmHealthSnapshot = {
        ok: false,
        checkedAt: new Date().toISOString(),
        latencyMs,
        model,
        error: `HTTP ${res.status}: ${errText.slice(0, 160)}`,
        consecutiveFailures: (prev?.consecutiveFailures ?? 0) + 1,
        source: opts.source,
      };
      await saveHealth(snapshot);
      return snapshot;
    }

    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    if (!modelListed(data.models, model)) {
      const snapshot: LlmHealthSnapshot = {
        ok: false,
        checkedAt: new Date().toISOString(),
        latencyMs,
        model,
        error: `Model ${model} not found in /api/tags`,
        consecutiveFailures: (prev?.consecutiveFailures ?? 0) + 1,
        source: opts.source,
      };
      await saveHealth(snapshot);
      return snapshot;
    }

    const snapshot: LlmHealthSnapshot = {
      ok: true,
      checkedAt: new Date().toISOString(),
      latencyMs,
      model,
      error: null,
      consecutiveFailures: 0,
      source: opts.source,
    };
    await saveHealth(snapshot);
    return snapshot;
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Probe timed out."
          : err.message
        : "Probe failed.";
    const snapshot: LlmHealthSnapshot = {
      ok: false,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      model,
      error: msg,
      consecutiveFailures: (prev?.consecutiveFailures ?? 0) + 1,
      source: opts.source,
    };
    await saveHealth(snapshot);
    return snapshot;
  } finally {
    clearTimeout(timer);
  }
}

export async function recordInterpretSuccess(): Promise<void> {
  const model = interpretModelName();
  const prev = await getLlmHealth();
  await saveHealth({
    ok: true,
    checkedAt: new Date().toISOString(),
    latencyMs: prev?.latencyMs ?? null,
    model,
    error: null,
    consecutiveFailures: 0,
    source: "breaker",
  });
}

export async function recordInterpretFailure(error: string): Promise<void> {
  const model = interpretModelName();
  const prev = await getLlmHealth();
  const consecutiveFailures = (prev?.consecutiveFailures ?? 0) + 1;
  const trip = consecutiveFailures >= FAILURE_THRESHOLD;
  await saveHealth({
    ok: trip ? false : (prev?.ok ?? true),
    checkedAt: new Date().toISOString(),
    latencyMs: prev?.latencyMs ?? null,
    model,
    error: error.slice(0, 200),
    consecutiveFailures,
    source: "breaker",
  });
}
