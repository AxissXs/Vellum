import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { queryCalendar } from "@/lib/query-calendar";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, "view_calendar")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  if (!fromParam || !toParam) {
    return NextResponse.json(
      { error: "from and to query params are required" },
      { status: 400 }
    );
  }

  const from = new Date(fromParam);
  const to = new Date(toParam);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid from/to dates" }, { status: 400 });
  }

  const scope = url.searchParams.get("scope") === "team" ? "team" : "me";
  const filterUserId = url.searchParams.get("userId");
  const layersParam = url.searchParams.get("layers") || "schedules,activity,tasks,holidays";

  const data = await queryCalendar(user, {
    from,
    to,
    scope,
    filterUserId,
    layers: layersParam.split(","),
  });

  return NextResponse.json(data);
}

export async function POST() {
  return NextResponse.json(
    { error: "Use POST /api/schedules to create schedules" },
    { status: 405 }
  );
}
