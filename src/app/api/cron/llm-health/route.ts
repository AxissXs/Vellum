import { NextRequest, NextResponse } from "next/server";
import { probeLlmHealth } from "@/lib/telegram-interpret/health";

export const dynamic = "force-dynamic";

function authorize(req: NextRequest): "ok" | "unset" | "unauthorized" {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return "unset";

  const header = req.headers.get("authorization");
  const bearer =
    header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  const alt = req.headers.get("x-cron-secret")?.trim() || null;
  if (bearer === secret || alt === secret) return "ok";
  return "unauthorized";
}

async function runProbe() {
  const health = await probeLlmHealth({ source: "cron" });
  return NextResponse.json(health);
}

export async function GET(req: NextRequest) {
  const auth = authorize(req);
  if (auth === "unset") {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }
  if (auth === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runProbe();
}

export async function POST(req: NextRequest) {
  return GET(req);
}
