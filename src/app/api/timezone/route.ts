import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAppTimezone } from "@/lib/timezone-server";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const timezone = await getAppTimezone();
  return NextResponse.json({ timezone });
}
