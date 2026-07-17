"use client";

import { useMemo, useState } from "react";
import KanbanBoard from "./KanbanBoard";
import ProjectManagementPanel from "./ProjectManagementPanel";
import ProjectNav from "./ProjectNav";

type User = { id: string; name: string; avatarUrl: string | null };
type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  status: string;
  health: string;
  visibility: string;
  goal: string | null;
  keyResults: string | null;
  risks: string | null;
  startDate: string | null;
  targetDate: string | null;
};
type Milestone = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  ownerId: string | null;
};
type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  position: string;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
  assigneeAvatar: string | null;
};
type ProjectOption = { id: string; name: string; color: string | null };

const statusColumns = [
  { key: "backlog", label: "Backlog", color: "bg-slate-500" },
  { key: "todo", label: "To Do", color: "bg-blue-500" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { key: "review", label: "Review", color: "bg-purple-500" },
  { key: "done", label: "Done", color: "bg-emerald-500" },
];

function deriveMembers(tasks: Task[]) {
  const memberMap = new Map<
    string,
    { userId: string | null; name: string | null; openTasks: number; doneTasks: number }
  >();
  for (const task of tasks) {
    const key = task.assigneeId || "unassigned";
    const current = memberMap.get(key) || {
      userId: task.assigneeId,
      name: task.assigneeName || "Unassigned",
      openTasks: 0,
      doneTasks: 0,
    };
    if (task.status === "done") current.doneTasks += 1;
    else current.openTasks += 1;
    memberMap.set(key, current);
  }
  return Array.from(memberMap.values());
}

function deriveCompletionRate(tasks: Task[]) {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "done").length;
  return Math.round((done / tasks.length) * 100);
}

export default function ProjectDetailClient({
  project,
  initialTasks,
  initialMilestones,
  users,
  allProjects,
  currentUserId,
  userRole,
  canEdit,
  canDelete,
}: {
  project: Project;
  initialTasks: Task[];
  initialMilestones: Milestone[];
  users: User[];
  allProjects: ProjectOption[];
  currentUserId: string;
  userRole: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [tasks, setTasks] = useState(initialTasks);

  const completionRate = useMemo(() => deriveCompletionRate(tasks), [tasks]);
  const members = useMemo(() => deriveMembers(tasks), [tasks]);

  const kanbanColumns = useMemo(
    () =>
      statusColumns.map((col) => ({
        ...col,
        tasks: tasks
          .filter((t) => t.status === col.key)
          .sort((a, b) => Number(a.position) - Number(b.position)),
      })),
    [tasks]
  );

  return (
    <>
      <ProjectManagementPanel
        project={project}
        initialMilestones={initialMilestones}
        users={users}
        members={members}
        completionRate={completionRate}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      <ProjectNav projectId={project.id} />

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Delivery Board</h2>
          <p className="text-sm text-slate-500">
            Plan and move execution work across your workflow.
          </p>
        </div>
        <KanbanBoard
          key={project.id}
          projectId={project.id}
          initialColumns={kanbanColumns}
          users={users}
          allProjects={allProjects}
          currentUserId={currentUserId}
          userRole={userRole}
          onTasksChange={setTasks}
        />
      </div>
    </>
  );
}
