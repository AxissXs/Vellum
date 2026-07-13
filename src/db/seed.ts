import "dotenv/config";
import { db, pool } from "./index";
import { users, projects, teams, teamMembers, tasks, comments, activityLogs, sprints, standups, retroItems, taskStatusHistory } from "./schema";
import { eq, inArray } from "drizzle-orm";
import { hashSync } from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await db.delete(activityLogs);
  await db.delete(retroItems);
  await db.delete(standups);
  await db.delete(taskStatusHistory);
  await db.delete(comments);
  await db.delete(tasks);
  await db.delete(sprints);
  await db.delete(teamMembers);
  await db.delete(teams);
  await db.delete(projects);
  await db.delete(users);

  // Create users
  const passwordHash = hashSync("password123", 10);
  const userIds = await db
.insert(users)
    .values([
      {
        name: "Alex Morgan",
        email: "alex@vellum.app",
        passwordHash,
        role: "superadmin",
        avatarUrl: "",
      },
      {
        name: "Sarah Chen",
        email: "sarah@vellum.app",
        passwordHash,
        role: "admin",
        avatarUrl: "",
      },
      {
        name: "Marcus Johnson",
        email: "marcus@vellum.app",
        passwordHash,
        role: "member",
        avatarUrl: "",
      },
      {
        name: "Emily Rodriguez",
        email: "emily@vellum.app",
        passwordHash,
        role: "member",
        avatarUrl: "",
      },
      {
        name: "David Kim",
        email: "david@vellum.app",
        passwordHash,
        role: "member",
        avatarUrl: "",
      },
      {
        name: "Lisa Thompson",
        email: "lisa@vellum.app",
        passwordHash,
        role: "admin",
        avatarUrl: "",
      },
      {
        name: "James Wilson",
        email: "james@vellum.app",
        passwordHash,
        role: "member",
        avatarUrl: "",
      },
      {
        name: "Anna Martinez",
        email: "anna@vellum.app",
        passwordHash,
        role: "member",
        avatarUrl: "",
      },
    ])
    .returning({ id: users.id, name: users.name });

  const userMap = new Map(userIds.map((u) => [u.name, u.id]));
  const alexId = userMap.get("Alex Morgan")!;
  const sarahId = userMap.get("Sarah Chen")!;
  const marcusId = userMap.get("Marcus Johnson")!;
  const emilyId = userMap.get("Emily Rodriguez")!;
  const davidId = userMap.get("David Kim")!;
  const lisaId = userMap.get("Lisa Thompson")!;
  const jamesId = userMap.get("James Wilson")!;
  const annaId = userMap.get("Anna Martinez")!;

  // Create teams
  const teamIds = await db
    .insert(teams)
    .values([
      {
        name: "Engineering",
        description: "Core engineering team building the product",
      },
      {
        name: "Design",
        description: "UX and visual design team",
      },
      {
        name: "Marketing",
        description: "Growth and content marketing",
      },
      {
        name: "Product",
        description: "Product management and strategy",
      },
    ])
    .returning({ id: teams.id, name: teams.name });

  const teamMap = new Map(teamIds.map((t) => [t.name, t.id]));
  const engTeamId = teamMap.get("Engineering")!;
  const designTeamId = teamMap.get("Design")!;
  const marketingTeamId = teamMap.get("Marketing")!;
  const productTeamId = teamMap.get("Product")!;

  // Create projects
  const projectIds = await db
    .insert(projects)
    .values([
{
        name: "Vellum Platform",
        description: "Core team management application with kanban boards and collaboration features",
        color: "#6366f1",
        icon: "layout-dashboard",
        ownerId: alexId,
      },
      {
        name: "Mobile App Redesign",
        description: "Complete UI/UX overhaul of the mobile application for iOS and Android",
        color: "#ec4899",
        icon: "smartphone",
        ownerId: sarahId,
      },
      {
        name: "API Gateway",
        description: "Build a new API gateway service for microservices communication",
        color: "#10b981",
        icon: "server",
        ownerId: davidId,
      },
      {
        name: "Q4 Marketing Campaign",
        description: "End of year marketing push across all channels",
        color: "#f59e0b",
        icon: "megaphone",
        ownerId: lisaId,
      },
      {
        name: "Developer Docs",
        description: "Comprehensive documentation portal for external developers",
        color: "#8b5cf6",
        icon: "book-open",
        ownerId: jamesId,
      },
    ])
    .returning({ id: projects.id, name: projects.name });

  const projectMap = new Map(projectIds.map((p) => [p.name, p.id]));
  const vellumProjectId = projectMap.get("Vellum Platform")!;
  const mobileProjectId = projectMap.get("Mobile App Redesign")!;
  const apiProjectId = projectMap.get("API Gateway")!;
  const marketingProjectId = projectMap.get("Q4 Marketing Campaign")!;
  const docsProjectId = projectMap.get("Developer Docs")!;

  // Create team members
  await db.insert(teamMembers).values([
    { teamId: engTeamId, userId: alexId, projectId: vellumProjectId },
    { teamId: engTeamId, userId: davidId, projectId: vellumProjectId },
    { teamId: engTeamId, userId: jamesId, projectId: apiProjectId },
    { teamId: engTeamId, userId: annaId, projectId: vellumProjectId },
    { teamId: designTeamId, userId: sarahId, projectId: mobileProjectId },
    { teamId: designTeamId, userId: emilyId, projectId: mobileProjectId },
    { teamId: designTeamId, userId: annaId, projectId: mobileProjectId },
    { teamId: marketingTeamId, userId: lisaId, projectId: marketingProjectId },
    { teamId: marketingTeamId, userId: marcusId, projectId: marketingProjectId },
    { teamId: productTeamId, userId: alexId, projectId: vellumProjectId },
    { teamId: productTeamId, userId: sarahId, projectId: mobileProjectId },
    { teamId: productTeamId, userId: lisaId, projectId: marketingProjectId },
  ]);

  // Create tasks
  const taskData = [
    // Vellum Platform tasks
    {
      title: "Set up CI/CD pipeline",
      description: "Configure GitHub Actions for automated testing and deployment to staging environment.",
      status: "done" as const,
      priority: "high" as const,
      projectId: vellumProjectId,
      assigneeId: davidId,
      creatorId: alexId,
      dueDate: new Date("2026-03-15"),
      position: "0",
    },
    {
      title: "Implement user authentication",
      description: "Add email/password authentication with session management and role-based access control.",
      status: "done" as const,
      priority: "urgent" as const,
      projectId: vellumProjectId,
      assigneeId: jamesId,
      creatorId: alexId,
      dueDate: new Date("2026-03-20"),
      position: "1",
    },
    {
      title: "Design database schema",
      description: "Create normalized database schema for users, projects, tasks, teams, and activity logging.",
      status: "done" as const,
      priority: "high" as const,
      projectId: vellumProjectId,
      assigneeId: annaId,
      creatorId: alexId,
      dueDate: new Date("2026-03-22"),
      position: "2",
    },
    {
      title: "Build Kanban board UI",
      description: "Create drag-and-drop kanban board with smooth animations and task cards showing priority, assignee, and due date.",
      status: "in_progress" as const,
      priority: "high" as const,
      projectId: vellumProjectId,
      assigneeId: annaId,
      creatorId: alexId,
      dueDate: new Date("2026-04-05"),
      position: "0",
    },
    {
      title: "Add real-time notifications",
      description: "Implement notification system for task assignments, comments, and status changes using WebSockets.",
      status: "todo" as const,
      priority: "medium" as const,
      projectId: vellumProjectId,
      assigneeId: davidId,
      creatorId: alexId,
      dueDate: new Date("2026-04-12"),
      position: "0",
    },
    {
      title: "Create reporting dashboard",
      description: "Build analytics dashboard showing team velocity, burndown charts, and task completion metrics.",
      status: "backlog" as const,
      priority: "medium" as const,
      projectId: vellumProjectId,
      assigneeId: jamesId,
      creatorId: alexId,
      dueDate: new Date("2026-04-25"),
      position: "0",
    },
    {
      title: "Write API documentation",
      description: "Document all REST API endpoints with OpenAPI/Swagger specification for external developers.",
      status: "backlog" as const,
      priority: "low" as const,
      projectId: vellumProjectId,
      assigneeId: annaId,
      creatorId: alexId,
      dueDate: new Date("2026-05-01"),
      position: "1",
    },
    // Mobile App Redesign tasks
    {
      title: "User research interviews",
      description: "Conduct 10 user interviews to gather feedback on current mobile app pain points.",
      status: "done" as const,
      priority: "high" as const,
      projectId: mobileProjectId,
      assigneeId: emilyId,
      creatorId: sarahId,
      dueDate: new Date("2026-03-18"),
      position: "0",
    },
    {
      title: "Create wireframes",
      description: "Design low-fidelity wireframes for all main screens of the redesigned app.",
      status: "in_progress" as const,
      priority: "high" as const,
      projectId: mobileProjectId,
      assigneeId: sarahId,
      creatorId: sarahId,
      dueDate: new Date("2026-04-01"),
      position: "0",
    },
    {
      title: "Design system update",
      description: "Update the design system tokens, components, and typography for the new mobile experience.",
      status: "in_progress" as const,
      priority: "medium" as const,
      projectId: mobileProjectId,
      assigneeId: emilyId,
      creatorId: sarahId,
      dueDate: new Date("2026-04-08"),
      position: "1",
    },
    {
      title: "High-fidelity mockups",
      description: "Create pixel-perfect mockups for all screens based on approved wireframes.",
      status: "todo" as const,
      priority: "high" as const,
      projectId: mobileProjectId,
      assigneeId: sarahId,
      creatorId: sarahId,
      dueDate: new Date("2026-04-15"),
      position: "0",
    },
    {
      title: "Prototype interactions",
      description: "Build interactive prototype in Figma for user testing sessions.",
      status: "todo" as const,
      priority: "medium" as const,
      projectId: mobileProjectId,
      assigneeId: annaId,
      creatorId: sarahId,
      dueDate: new Date("2026-04-20"),
      position: "1",
    },
    // API Gateway tasks
    {
      title: "Rate limiting middleware",
      description: "Implement token bucket rate limiter with Redis backend for all API routes.",
      status: "in_progress" as const,
      priority: "urgent" as const,
      projectId: apiProjectId,
      assigneeId: davidId,
      creatorId: davidId,
      dueDate: new Date("2026-04-02"),
      position: "0",
    },
    {
      title: "Service discovery",
      description: "Integrate Consul for automatic service registration and health checking.",
      status: "todo" as const,
      priority: "high" as const,
      projectId: apiProjectId,
      assigneeId: jamesId,
      creatorId: davidId,
      dueDate: new Date("2026-04-10"),
      position: "0",
    },
    {
      title: "Request logging & tracing",
      description: "Add distributed tracing with OpenTelemetry and structured JSON logging.",
      status: "review" as const,
      priority: "high" as const,
      projectId: apiProjectId,
      assigneeId: jamesId,
      creatorId: davidId,
      dueDate: new Date("2026-03-30"),
      position: "0",
    },
    // Marketing Campaign tasks
    {
      title: "Social media content calendar",
      description: "Plan and schedule social media posts for Q4 across Twitter, LinkedIn, and Instagram.",
      status: "in_progress" as const,
      priority: "medium" as const,
      projectId: marketingProjectId,
      assigneeId: marcusId,
      creatorId: lisaId,
      dueDate: new Date("2026-04-05"),
      position: "0",
    },
    {
      title: "Email newsletter series",
      description: "Design and write 6-part email nurture series for product launch.",
      status: "todo" as const,
      priority: "high" as const,
      projectId: marketingProjectId,
      assigneeId: lisaId,
      creatorId: lisaId,
      dueDate: new Date("2026-04-12"),
      position: "0",
    },
    {
      title: "Landing page optimization",
      description: "A/B test new landing page variants to improve conversion rate.",
      status: "backlog" as const,
      priority: "medium" as const,
      projectId: marketingProjectId,
      assigneeId: marcusId,
      creatorId: lisaId,
      dueDate: new Date("2026-04-18"),
      position: "0",
    },
  ];

  await db.insert(tasks).values(taskData);

  // Create a few comments
  const taskRows = await db.select({ id: tasks.id, title: tasks.title }).from(tasks);
  const taskIdMap = new Map(taskRows.map((t) => [t.title, t.id]));

  await db.insert(comments).values([
    {
      content: "I've set up the pipeline with staging and production environments. Need to add secrets for the deployment keys.",
      taskId: taskIdMap.get("Set up CI/CD pipeline")!,
      authorId: davidId,
    },
    {
      content: "Great work! Let me know when secrets are configured and I'll trigger the first deployment.",
      taskId: taskIdMap.get("Set up CI/CD pipeline")!,
      authorId: alexId,
    },
    {
      content: "The auth system is working. I've implemented role-based middleware for all API routes.",
      taskId: taskIdMap.get("Implement user authentication")!,
      authorId: jamesId,
    },
    {
      content: "Can we add 2FA as a follow-up task? It would be great for enterprise customers.",
      taskId: taskIdMap.get("Implement user authentication")!,
      authorId: sarahId,
    },
    {
      content: "Progress update: columns are draggable, working on the task creation modal now.",
      taskId: taskIdMap.get("Build Kanban board UI")!,
      authorId: annaId,
    },
    {
      content: "The rate limiter is working well in testing. I'm using a sliding window approach for better accuracy.",
      taskId: taskIdMap.get("Rate limiting middleware")!,
      authorId: davidId,
    },
  ]);

  // Assign story-point estimates to a subset of tasks
  await db
    .update(tasks)
    .set({ estimate: 5 })
    .where(eq(tasks.id, taskIdMap.get("Build Kanban board UI")!));
  await db
    .update(tasks)
    .set({ estimate: 3 })
    .where(eq(tasks.id, taskIdMap.get("Add real-time notifications")!));
  await db
    .update(tasks)
    .set({ estimate: 8 })
    .where(eq(tasks.id, taskIdMap.get("Create reporting dashboard")!));
  await db
    .update(tasks)
    .set({ estimate: 2 })
    .where(eq(tasks.id, taskIdMap.get("Write API documentation")!));
  await db
    .update(tasks)
    .set({ estimate: 5 })
    .where(eq(tasks.id, taskIdMap.get("Design system update")!));
  await db
    .update(tasks)
    .set({ estimate: 3 })
    .where(eq(tasks.id, taskIdMap.get("High-fidelity mockups")!));
  await db
    .update(tasks)
    .set({ estimate: 5 })
    .where(eq(tasks.id, taskIdMap.get("Rate limiting middleware")!));
  await db
    .update(tasks)
    .set({ estimate: 3 })
    .where(eq(tasks.id, taskIdMap.get("Service discovery")!));

  // Create an active sprint for the Vellum Platform project
  const now = new Date();
  const sprintStart = new Date(now);
  sprintStart.setDate(sprintStart.getDate() - 7);
  const sprintEnd = new Date(now);
  sprintEnd.setDate(sprintEnd.getDate() + 7);

  const [sprint] = await db
    .insert(sprints)
    .values({
      projectId: vellumProjectId,
      name: "Sprint 1 — Core Experience",
      goal: "Ship the kanban board and notifications for the core platform.",
      startDate: sprintStart,
      endDate: sprintEnd,
      status: "active",
    })
    .returning({ id: sprints.id });

  const sprintId = sprint.id;

  // Pull a few tasks into the sprint
  const sprintTaskTitles = [
    "Build Kanban board UI",
    "Add real-time notifications",
    "Create reporting dashboard",
    "Write API documentation",
  ];
  await db
    .update(tasks)
    .set({ sprintId })
    .where(
      inArray(tasks.id, sprintTaskTitles.map((t) => taskIdMap.get(t)!))
    );

  // Seed status history for sprinted tasks (so burndown has data)
  const historyRows: { taskId: string; status: string; daysAgo: number }[] = [
    { taskId: taskIdMap.get("Build Kanban board UI")!, status: "in_progress", daysAgo: 7 },
    { taskId: taskIdMap.get("Add real-time notifications")!, status: "todo", daysAgo: 6 },
    { taskId: taskIdMap.get("Create reporting dashboard")!, status: "backlog", daysAgo: 6 },
    { taskId: taskIdMap.get("Write API documentation")!, status: "backlog", daysAgo: 5 },
  ];
  await db.insert(taskStatusHistory).values(
    historyRows.map((h) => {
      const changed = new Date(now);
      changed.setDate(changed.getDate() - h.daysAgo);
      return {
        taskId: h.taskId,
        sprintId,
        status: h.status as
          | "backlog"
          | "todo"
          | "in_progress"
          | "review"
          | "done",
        changedAt: changed,
      };
    })
  );

  // Seed some standups for the active sprint
  await db.insert(standups).values([
    {
      userId: annaId,
      sprintId,
      date: new Date(now),
      yesterday: "Finished wiring up column drag events.",
      today: "Adding the task creation modal and optimistic updates.",
      blockers: "None",
    },
    {
      userId: davidId,
      sprintId,
      date: new Date(now),
      yesterday: "Hooked up the WebSocket broadcast layer.",
      today: "Building the notification centre UI.",
      blockers: "Waiting on design tokens.",
    },
  ]);

  // Seed retro items for the (completed) previous sprint
  const [prevSprint] = await db
    .insert(sprints)
    .values({
      projectId: vellumProjectId,
      name: "Sprint 0 — Foundations",
      goal: "Establish the platform foundation.",
      startDate: new Date(sprintStart.getTime() - 14 * 86400000),
      endDate: new Date(sprintStart.getTime() - 1),
      status: "completed",
    })
    .returning({ id: sprints.id });

  await db.insert(retroItems).values([
    {
      sprintId: prevSprint.id,
      authorId: alexId,
      category: "went_well",
      content: "Strong collaboration between engineering and design.",
    },
    {
      sprintId: prevSprint.id,
      authorId: sarahId,
      category: "went_wrong",
      content: "Stories were under-estimated, causing spillover.",
    },
    {
      sprintId: prevSprint.id,
      authorId: davidId,
      category: "action_item",
      content: "Adopt story points consistently during planning.",
    },
  ]);

  // Create activity logs
  await db.insert(activityLogs).values([
    { userId: alexId, action: "created_project", entityType: "project", entityId: vellumProjectId, details: "Created project: Vellum Platform" },
    { userId: sarahId, action: "created_project", entityType: "project", entityId: mobileProjectId, details: "Created project: Mobile App Redesign" },
    { userId: davidId, action: "created_project", entityType: "project", entityId: apiProjectId, details: "Created project: API Gateway" },
    { userId: lisaId, action: "created_project", entityType: "project", entityId: marketingProjectId, details: "Created project: Q4 Marketing Campaign" },
    { userId: davidId, action: "completed_task", entityType: "task", entityId: taskIdMap.get("Set up CI/CD pipeline")!, details: "Completed: Set up CI/CD pipeline" },
    { userId: jamesId, action: "completed_task", entityType: "task", entityId: taskIdMap.get("Implement user authentication")!, details: "Completed: Implement user authentication" },
    { userId: annaId, action: "started_task", entityType: "task", entityId: taskIdMap.get("Build Kanban board UI")!, details: "Started working on: Build Kanban board UI" },
    { userId: davidId, action: "started_task", entityType: "task", entityId: taskIdMap.get("Rate limiting middleware")!, details: "Started working on: Rate limiting middleware" },
    { userId: emilyId, action: "completed_task", entityType: "task", entityId: taskIdMap.get("User research interviews")!, details: "Completed: User research interviews" },
    { userId: sarahId, action: "started_task", entityType: "task", entityId: taskIdMap.get("Create wireframes")!, details: "Started working on: Create wireframes" },
  ]);

  console.log("✅ Seed completed successfully!");
  console.log("\n📧 Demo accounts (password: password123):");
  console.log("  Superadmin: alex@vellum.app");
  console.log("  Admin:      sarah@vellum.app / lisa@vellum.app");
  console.log("  Member:     marcus@vellum.app / emily@vellum.app / david@vellum.app / james@vellum.app / anna@vellum.app");
}

seed()
  .catch(console.error)
  .finally(() => pool.end());
