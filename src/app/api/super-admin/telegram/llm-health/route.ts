import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import {
  getInterpretThinkEnabled,
  getLlmHealth,
  interpretModelName,
  isInterpretUrlConfigured,
  probeLlmHealth,
  setInterpretThinkEnabled,
} from "@/lib/telegram-interpret/health";

async function requireSuperAdmin() {
  const user = await getSession();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  try {
    requireRole(user, ["superadmin"]);
  } catch {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const gate = await requireSuperAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const [health, thinkEnabled] = await Promise.all([
    getLlmHealth(),
    getInterpretThinkEnabled(),
  ]);

  return NextResponse.json({
    configured: isInterpretUrlConfigured(),
    model: interpretModelName(),
    thinkEnabled,
    health,
  });
}

export async function POST() {
  const gate = await requireSuperAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const health = await probeLlmHealth({ source: "probe" });
  const thinkEnabled = await getInterpretThinkEnabled();

  return NextResponse.json({
    configured: isInterpretUrlConfigured(),
    model: interpretModelName(),
    thinkEnabled,
    health,
  });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireSuperAdmin();
  if ("error" in gate && gate.error) return gate.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const thinkEnabled = (body as { thinkEnabled?: unknown })?.thinkEnabled;
  if (typeof thinkEnabled !== "boolean") {
    return NextResponse.json(
      { error: "thinkEnabled boolean required" },
      { status: 400 }
    );
  }

  await setInterpretThinkEnabled(thinkEnabled);

  const [health, enabled] = await Promise.all([
    getLlmHealth(),
    getInterpretThinkEnabled(),
  ]);

  return NextResponse.json({
    configured: isInterpretUrlConfigured(),
    model: interpretModelName(),
    thinkEnabled: enabled,
    health,
  });
}
