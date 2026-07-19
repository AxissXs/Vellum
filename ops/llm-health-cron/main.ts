const JOB_NAME = "perfect-llm-health";
const SCHEDULE = "*/5 * * * *";

function requiredEnv(name: "APP_URL" | "CRON_SECRET"): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function probeLlmHealth(): Promise<void> {
  const appUrl = requiredEnv("APP_URL").replace(/\/$/, "");
  const secret = requiredEnv("CRON_SECRET");
  const response = await fetch(`${appUrl}/api/cron/llm-health`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `LLM health probe failed (${response.status}): ${body.slice(0, 200)}`,
    );
  }
}

Deno.cron(
  JOB_NAME,
  SCHEDULE,
  { backoffSchedule: [5_000, 30_000, 60_000] },
  probeLlmHealth,
);

Deno.serve(() =>
  Response.json({
    ok: true,
    job: JOB_NAME,
    schedule: SCHEDULE,
    targetConfigured: Boolean(
      Deno.env.get("APP_URL")?.trim() && Deno.env.get("CRON_SECRET")?.trim(),
    ),
  })
);
