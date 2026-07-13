import { hashSync } from "bcryptjs";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  comments,
  projects,
  tasks,
  teamMembers,
  teams,
  users,
  sprints,
  standups,
  retroItems,
} from "@/db/schema";

let bootstrapPromise: Promise<void> | null = null;

export function ensureDemoData() {
  bootstrapPromise ??= seedIfEmpty();
  return bootstrapPromise;
}

async function seedIfEmpty() {
  const [existingUsers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  if (existingUsers.count > 0) return;

  const passwordHash = hashSync("password123", 10);

  const insertedUsers = await db
    .insert(users)
    .values([
      {
        name: "Alex Morgan",
        email: "alex@vellum.app",
        passwordHash,
        role: "superadmin",
      },
      {
        name: "Sarah Chen",
        email: "sarah@vellum.app",
        passwordHash,
        role: "admin",
      },
      {
        name: "Marcus Johnson",
        email: "marcus@vellum.app",
        passwordHash,
        role: "member",
      },
      {
        name: "Emily Rodriguez",
        email: "emily@vellum.app",
        passwordHash,
        role: "member",
      },
      {
        name: "David Kim",
        email: "david@vellum.app",
        passwordHash,
        role: "member",
      },
    ])
    .returning({ id: users.id, name: users.name });

  const userMap = new Map(insertedUsers.map((user) => [user.name, user.id]));
  const alexId = userMap.get("Alex Morgan")!;
  const sarahId = userMap.get("Sarah Chen")!;
  const marcusId = userMap.get("Marcus Johnson")!;
  const emilyId = userMap.get("Emily Rodriguez")!;
  const davidId = userMap.get("David Kim")!;

  const insertedTeams = await db
    .insert(teams)
    .values([
      { name: "Engineering", description: "Core product engineering" },
      { name: "Design", description: "User experience and product design" },
      { name: "Growth", description: "Marketing, launches, and customer growth" },
    ])
    .returning({ id: teams.id, name: teams.name });

  const teamMap = new Map(insertedTeams.map((team) => [team.name, team.id]));

  const insertedProjects = await db
    .insert(projects)
    .values([
      {
        name: "Vellum Platform",
        description:
          "Core team management platform with kanban boards, activity tracking, and collaboration.",
        color: "#6366f1",
        icon: "layout-dashboard",
        ownerId: alexId,
      },
      {
        name: "Mobile App Redesign",
        description:
          "A clean, modern mobile experience with improved onboarding and task workflows.",
        color: "#ec4899",
        icon: "smartphone",
        ownerId: sarahId,
      },
      {
        name: "Q4 Launch Campaign",
        description:
          "Coordinated launch plan across email, social, landing pages, and paid acquisition.",
        color: "#f59e0b",
        icon: "megaphone",
        ownerId: marcusId,
      },
    ])
    .returning({ id: projects.id, name: projects.name });

  const projectMap = new Map(insertedProjects.map((project) => [project.name, project.id]));
  const platformId = projectMap.get("Vellum Platform")!;
  const mobileId = projectMap.get("Mobile App Redesign")!;
  const launchId = projectMap.get("Q4 Launch Campaign")!;

  await db.insert(teamMembers).values([
    { teamId: teamMap.get("Engineering")!, userId: alexId, projectId: platformId },
    { teamId: teamMap.get("Engineering")!, userId: davidId, projectId: platformId },
    { teamId: teamMap.get("Design")!, userId: sarahId, projectId: mobileId },
    { teamId: teamMap.get("Design")!, userId: emilyId, projectId: mobileId },
    { teamId: teamMap.get("Growth")!, userId: marcusId, projectId: launchId },
  ]);

  const insertedTasks = await db
    .insert(tasks)
    .values([
      {
        title: "Finalize authentication flow",
        description:
          "Verify login, logout, role permissions, and session persistence across preview builds.",
        status: "done",
        priority: "urgent",
        projectId: platformId,
        assigneeId: alexId,
        creatorId: alexId,
        dueDate: new Date("2026-03-18"),
        position: "0",
      },
      {
        title: "Build kanban task interactions",
        description:
          "Support creating tasks, editing details, changing status, and commenting from the board.",
        status: "in_progress",
        priority: "high",
        projectId: platformId,
        assigneeId: davidId,
        creatorId: alexId,
        dueDate: new Date("2026-04-05"),
        position: "0",
      },
      {
        title: "Add reporting widgets",
        description:
          "Add velocity, completion, overdue, and workload cards for managers.",
        status: "todo",
        priority: "medium",
        projectId: platformId,
        assigneeId: alexId,
        creatorId: alexId,
        dueDate: new Date("2026-04-18"),
        position: "0",
      },
      {
        title: "Research onboarding friction",
        description:
          "Interview customers and summarize friction points in mobile onboarding.",
        status: "review",
        priority: "high",
        projectId: mobileId,
        assigneeId: emilyId,
        creatorId: sarahId,
        dueDate: new Date("2026-04-02"),
        position: "0",
      },
      {
        title: "Create high-fidelity prototype",
        description:
          "Prototype redesigned task creation and project overview screens.",
        status: "todo",
        priority: "medium",
        projectId: mobileId,
        assigneeId: sarahId,
        creatorId: sarahId,
        dueDate: new Date("2026-04-15"),
        position: "0",
      },
      {
        title: "Draft launch email sequence",
        description:
          "Write a five-part nurture campaign for new workspaces and team leads.",
        status: "in_progress",
        priority: "high",
        projectId: launchId,
        assigneeId: marcusId,
        creatorId: marcusId,
        dueDate: new Date("2026-04-08"),
        position: "0",
      },
      {
        title: "Landing page A/B test",
        description:
          "Prepare hero copy variations and conversion tracking for launch page experiments.",
        status: "backlog",
        priority: "low",
        projectId: launchId,
        assigneeId: marcusId,
        creatorId: marcusId,
        dueDate: new Date("2026-04-22"),
        position: "0",
      },
    ])
    .returning({ id: tasks.id, title: tasks.title });

  const taskMap = new Map(insertedTasks.map((task) => [task.title, task.id]));

  await db.insert(comments).values([
    {
      content: "Authentication now uses durable sessions so it works across production workers.",
      taskId: taskMap.get("Finalize authentication flow")!,
      authorId: alexId,
    },
    {
      content: "Kanban status changes are optimistically updated and persisted through the API.",
      taskId: taskMap.get("Build kanban task interactions")!,
      authorId: davidId,
    },
  ]);

  const now = new Date();
  const sprintStart = new Date(now);
  sprintStart.setDate(sprintStart.getDate() - 7);
  const sprintEnd = new Date(now);
  sprintEnd.setDate(sprintEnd.getDate() + 7);

  const [sprint] = await db
    .insert(sprints)
    .values({
      projectId: platformId,
      name: "Sprint 1 — Core Experience",
      goal: "Ship kanban interactions and reporting widgets.",
      startDate: sprintStart,
      endDate: sprintEnd,
      status: "active",
    })
    .returning({ id: sprints.id });

  await db
    .update(tasks)
    .set({ sprintId: sprint.id, estimate: 5 })
    .where(eq(tasks.id, taskMap.get("Build kanban task interactions")!));
  await db
    .update(tasks)
    .set({ sprintId: sprint.id, estimate: 3 })
    .where(eq(tasks.id, taskMap.get("Add reporting widgets")!));

  await db.insert(standups).values([
    {
      userId: davidId,
      sprintId: sprint.id,
      date: now,
      yesterday: "Wired up drag-and-drop reordering.",
      today: "Adding optimistic persistence to the board.",
      blockers: "None",
    },
  ]);

  await db.insert(retroItems).values([
    {
      sprintId: sprint.id,
      authorId: alexId,
      category: "went_well",
      content: "Faster iteration with the new kanban board.",
    },
    {
      sprintId: sprint.id,
      authorId: davidId,
      category: "action_item",
      content: "Capture estimates during planning for better burndown.",
    },
  ]);

  await db.insert(activityLogs).values([
    {
      userId: alexId,
      action: "created_project",
      entityType: "project",
      entityId: platformId,
      details: "Created project: Vellum Platform",
    },
    {
      userId: sarahId,
      action: "created_project",
      entityType: "project",
      entityId: mobileId,
      details: "Created project: Mobile App Redesign",
    },
    {
      userId: marcusId,
      action: "created_project",
      entityType: "project",
      entityId: launchId,
      details: "Created project: Q4 Launch Campaign",
    },
    {
      userId: alexId,
      action: "completed_task",
      entityType: "task",
      entityId: taskMap.get("Finalize authentication flow")!,
      details: "Completed: Finalize authentication flow",
    },
    {
      userId: davidId,
      action: "started_task",
      entityType: "task",
      entityId: taskMap.get("Build kanban task interactions")!,
      details: "Started working on: Build kanban task interactions",
    },
  ]);
}
