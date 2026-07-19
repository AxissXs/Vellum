import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sprints, tasks, taskStatusHistory } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, gte, lte, asc, desc, isNull } from "drizzle-orm";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
  if (!sprint) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }

  const start = sprint.startDate
    ? startOfDay(new Date(sprint.startDate))
    : startOfDay(new Date(sprint.createdAt));

  let end = sprint.endDate ? new Date(sprint.endDate) : new Date();
  if (end < start) {
    end = new Date(start);
    end.setDate(end.getDate() + 13);
  }

  const sprintTasks = await db
    .select({ id: tasks.id, estimate: tasks.estimate })
    .from(tasks)
    .where(and(eq(tasks.sprintId, id), isNull(tasks.deletedAt)));

  const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.estimate ?? 0), 0);
  const taskIds = sprintTasks.map((t) => t.id);

  // History of status changes for sprint tasks, ordered oldest -> newest.
  let history: { taskId: string; status: string; changedAt: Date }[] = [];
  if (taskIds.length) {
    history = await db
      .select({
        taskId: taskStatusHistory.taskId,
        status: taskStatusHistory.status,
        changedAt: taskStatusHistory.changedAt,
      })
      .from(taskStatusHistory)
      .where(
        and(
          eq(taskStatusHistory.sprintId, id),
          gte(taskStatusHistory.changedAt, start),
          lte(taskStatusHistory.changedAt, end)
        )
      )
      .orderBy(asc(taskStatusHistory.changedAt));
  }

  // Build the day axis from sprint start to end (inclusive), capped at ~60 days.
  const days: Date[] = [];
  const cursor = new Date(start);
  const maxDays = 60;
  while (cursor <= end && days.length < maxDays) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Seed each task's latest known status with the state at sprint start (default "backlog").
  const latestStatus = new Map<string, string>();
  for (const t of sprintTasks) latestStatus.set(t.id, "backlog");

  // Compute remaining points at the end of each day.
  const series = days.map((day) => {
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    for (const h of history) {
      if (new Date(h.changedAt) <= dayEnd) {
        latestStatus.set(h.taskId, h.status);
      } else {
        break;
      }
    }

    let remaining = 0;
    for (const [taskId, status] of latestStatus) {
      if (status !== "done") {
        remaining += sprintTasks.find((t) => t.id === taskId)?.estimate ?? 0;
      }
    }

    return {
      date: day.toISOString().slice(0, 10),
      remaining,
    };
  });

  // Ideal line: linear from totalPoints to 0 across the sprint window.
  const ideal = days.map((day, i) => ({
    date: day.toISOString().slice(0, 10),
    remaining: Math.max(0, Math.round(totalPoints * (1 - i / Math.max(1, days.length - 1)))),
  }));

  return NextResponse.json({
    sprintId: id,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    totalPoints,
    ideal,
    actual: series,
  });
}
