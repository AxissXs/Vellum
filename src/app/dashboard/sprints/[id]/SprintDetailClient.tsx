"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Calendar,
  Flag,
  Users,
  MessageSquare,
  ListTodo,
  TrendingDown,
  Plus,
  Loader2,
  X,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { clsx } from "clsx";
import KanbanBoard from "@/app/dashboard/projects/[id]/KanbanBoard";
import { useUpdateTask } from "@/hooks/useTasks";
import { useUpdateSprint } from "@/hooks/useSprints";
import { useStandups, useCreateStandup, type Standup } from "@/hooks/useStandups";
import {
  useRetros,
  useCreateRetroItem,
  useUpdateRetroItem,
  useDeleteRetroItem,
  type RetroItem,
} from "@/hooks/useRetros";
import { toast } from "sonner";
import { canMutateOwned, hasPermission } from "@/lib/permissions";

type Sprint = {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type User = { id: string; name: string; avatarUrl: string | null };
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
  sprintId: string | null;
  estimate: number | null;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
  assigneeAvatar: string | null;
};

const statusColumns = [
  { key: "backlog", label: "Backlog", color: "bg-slate-500" },
  { key: "todo", label: "To Do", color: "bg-blue-500" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { key: "review", label: "Review", color: "bg-purple-500" },
  { key: "done", label: "Done", color: "bg-emerald-500" },
];

type Tab = "board" | "burndown" | "planning" | "standup" | "retro";

export default function SprintDetailClient({
  sprint,
  project,
  tasks,
  backlogTasks,
  users,
  allProjects,
  currentUserId,
  userRole,
}: {
  sprint: Sprint;
  project: { id: string; name: string; color: string | null };
  tasks: Task[];
  backlogTasks: Task[];
  users: User[];
  allProjects: { id: string; name: string; color: string | null }[];
  currentUserId: string;
  userRole: string;
}) {
  const [tab, setTab] = useState<Tab>("board");
  const sprintId = sprint.id;
  const updateTask = useUpdateTask();
  const updateSprint = useUpdateSprint();
  const router = useRouter();

  const canComplete = hasPermission(userRole, "complete_sprint");
  const canManagePlanning = hasPermission(userRole, "edit_sprints");

  async function completeSprint() {
    const unfinished = boardTasks.filter((t) => t.status !== "done").length;
    const msg = unfinished
      ? `Complete this sprint? ${unfinished} unfinished task(s) will return to the project backlog.`
      : "Complete this sprint?";
    if (!confirm(msg)) return;
    await updateSprint.mutateAsync({
      id: sprint.id,
      projectId: sprint.projectId,
      status: "completed",
    });
    toast.success("Sprint completed — unfinished tasks returned to backlog");
    router.push("/dashboard/sprints");
  }

  const boardTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.sprintId === sprintId)
        .map((t) => ({ ...t, position: t.position || "0" })),
    [tasks, sprintId]
  );

  const kanbanColumns = useMemo(
    () =>
      statusColumns.map((col) => ({
        ...col,
        tasks: boardTasks
          .filter((t) => t.status === col.key)
          .sort((a, b) => Number(a.position) - Number(b.position)),
      })),
    [boardTasks]
  );

  // ---- Planning state ----
  const backlogForPlanning = useMemo(
    () => backlogTasks.filter((t) => !t.sprintId),
    [backlogTasks]
  );

  async function addToSprint(task: Task) {
    await updateTask.mutateAsync({ id: task.id, projectId: task.projectId, sprintId });
    toast.success(`Added "${task.title}" to sprint`);
    router.refresh();
  }

  async function removeFromSprint(task: Task) {
    await updateTask.mutateAsync({ id: task.id, projectId: task.projectId, sprintId: null });
    router.refresh();
  }

  const sprintPoints = boardTasks.reduce((sum, t) => sum + (t.estimate ?? 0), 0);
  const donePoints = boardTasks
    .filter((t) => t.status === "done")
    .reduce((sum, t) => sum + (t.estimate ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/sprints"
            className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowRight size={16} className="rotate-180" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{sprint.name}</h1>
              <span
                className={clsx(
                  "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
                  sprint.status === "active"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : sprint.status === "completed"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                )}
              >
                {sprint.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {project.name}
              {sprint.goal ? ` · ${sprint.goal}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar size={14} />
            {sprint.startDate
              ? new Date(sprint.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
            <span>→</span>
            {sprint.endDate
              ? new Date(sprint.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Flag size={14} />
            {donePoints}/{sprintPoints} pts
          </div>
          {canComplete && sprint.status !== "completed" && (
            <button
              onClick={completeSprint}
              disabled={updateSprint.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 text-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-500/20 transition disabled:opacity-50"
            >
              {updateSprint.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCircle2 size={13} />
              )}
              Complete sprint
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none]">
        <TabButton tab="board" current={tab} onClick={setTab} icon={<ListTodo size={15} />} label="Board" />
        <TabButton tab="burndown" current={tab} onClick={setTab} icon={<TrendingDown size={15} />} label="Burndown" />
        <TabButton tab="planning" current={tab} onClick={setTab} icon={<Flag size={15} />} label={`Planning (${backlogForPlanning.length})`} />
        <TabButton tab="standup" current={tab} onClick={setTab} icon={<Users size={15} />} label="Standup" />
        <TabButton tab="retro" current={tab} onClick={setTab} icon={<MessageSquare size={15} />} label="Retro" />
      </div>

      {tab === "board" && (
        <KanbanBoard
          key={`${sprintId}-${tasks.length}`}
          projectId={sprint.projectId}
          initialColumns={kanbanColumns}
          users={users}
          allProjects={allProjects}
          currentUserId={currentUserId}
          userRole={userRole}
          sprintId={sprintId}
        />
      )}

      {tab === "burndown" && <BurndownChart sprintId={sprintId} />}

      {tab === "planning" && (
        <PlanningPanel
          sprintTasks={boardTasks}
          backlog={backlogForPlanning}
          onAdd={addToSprint}
          onRemove={removeFromSprint}
          updating={updateTask.isPending}
          canManage={canManagePlanning}
        />
      )}

      {tab === "standup" && (
        <StandupPanel sprintId={sprintId} currentUserId={currentUserId} users={users} />
      )}

      {tab === "retro" && (
        <RetroPanel
          sprintId={sprintId}
          currentUserId={currentUserId}
          userRole={userRole}
        />
      )}
    </div>
  );
}

function TabButton({
  tab,
  current,
  onClick,
  icon,
  label,
}: {
  tab: Tab;
  current: Tab;
  onClick: (t: Tab) => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={() => onClick(tab)}
      className={clsx(
        "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px whitespace-nowrap flex-shrink-0",
        current === tab
          ? "text-brand-600 border-brand-500"
          : "text-slate-500 border-transparent hover:text-slate-800"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function BurndownChart({ sprintId }: { sprintId: string }) {
  const [data, setData] = useState<{
    totalPoints: number;
    ideal: { date: string; remaining: number }[];
    actual: { date: string; remaining: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/sprints/${sprintId}/burndown`)
      .then(async (res) => {
        const payload = await res.json();
        if (!active) return;
        if (!res.ok) {
          setData(null);
          setError(payload.error || "Failed to load burndown");
          return;
        }
        setError(null);
        setData(payload);
      })
      .catch(() => {
        if (active) {
          setData(null);
          setError("Failed to load burndown");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sprintId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-dashed border-slate-200 rounded-2xl py-16 text-center text-slate-500">
        {error}
      </div>
    );
  }

  if (!data?.actual?.length) {
    return (
      <div className="border-2 border-dashed border-slate-200 rounded-2xl py-16 text-center text-slate-500">
        No burndown data yet. Add tasks with estimates to this sprint.
      </div>
    );
  }

  const merged = data.actual.map((a, i) => ({
    date: a.date.slice(5),
    remaining: a.remaining,
    ideal: data.ideal[i]?.remaining ?? 0,
  }));

  return (
    <div className="bg-white/60 border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900">Burndown</h3>
        <span className="text-sm text-slate-500">{data.totalPoints} total points</span>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#fff",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="ideal"
              name="Ideal"
              stroke="#64748b"
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="remaining"
              name="Remaining"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PlanningPanel({
  sprintTasks,
  backlog,
  onAdd,
  onRemove,
  updating,
  canManage,
}: {
  sprintTasks: Task[];
  backlog: Task[];
  onAdd: (t: Task) => void;
  onRemove: (t: Task) => void;
  updating: boolean;
  canManage: boolean;
}) {
  const [filter, setFilter] = useState("");

  const filteredBacklog = backlog.filter((t) =>
    t.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="bg-white/60 border border-slate-200 rounded-2xl p-4">
        <h3 className="text-base font-semibold text-slate-900 mb-3">
          In Sprint ({sprintTasks.length})
        </h3>
        <div className="space-y-2 max-h-[480px] overflow-y-auto">
          {sprintTasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              <span className="text-sm text-slate-900 truncate">{t.title}</span>
              {canManage && (
                <button
                  onClick={() => onRemove(t)}
                  disabled={updating}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-500/10 transition"
                  title="Remove from sprint"
                  aria-label="Remove from sprint"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          {sprintTasks.length === 0 && (
            <p className="text-sm text-slate-500">No tasks in this sprint yet.</p>
          )}
        </div>
      </div>

      <div className="bg-white/60 border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-slate-900">Backlog</h3>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter tasks..."
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="space-y-2 max-h-[480px] overflow-y-auto">
          {filteredBacklog.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              <span className="text-sm text-slate-900 truncate">{t.title}</span>
              {canManage && (
                <button
                  onClick={() => onAdd(t)}
                  disabled={updating}
                  className="inline-flex items-center gap-1 text-xs rounded-lg bg-brand-500/10 text-brand-600 px-2 py-1 hover:bg-brand-500/20 transition"
                >
                  <Plus size={12} />
                  Add
                </button>
              )}
            </div>
          ))}
          {filteredBacklog.length === 0 && (
            <p className="text-sm text-slate-500">No backlog tasks available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StandupPanel({
  sprintId,
  currentUserId,
  users,
}: {
  sprintId: string;
  currentUserId: string;
  users: User[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: standups, isLoading } = useStandups({ sprintId });
  const createStandup = useCreateStandup();

  const [yesterday, setYesterday] = useState("");
  const [todayText, setTodayText] = useState("");
  const [blockers, setBlockers] = useState("");

  const myStandup = standups?.find((s) => s.userId === currentUserId && s.date.slice(0, 10) === today);

  async function submit() {
    if (!yesterday.trim() && !todayText.trim() && !blockers.trim()) return;
    await createStandup.mutateAsync({
      sprintId,
      yesterday: yesterday.trim() || null,
      today: todayText.trim() || null,
      blockers: blockers.trim() || null,
    });
    setYesterday("");
    setTodayText("");
    setBlockers("");
    toast.success("Standup logged");
  }

  const nameFor = (id: string) => users.find((u) => u.id === id)?.name || "Unknown";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="bg-white/60 border border-slate-200 rounded-2xl p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-4">My standup — {today}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Yesterday</label>
            <textarea
              value={yesterday}
              onChange={(e) => setYesterday(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="What did you complete?"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Today</label>
            <textarea
              value={todayText}
              onChange={(e) => setTodayText(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="What are you working on?"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Blockers</label>
            <textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              rows={1}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Anything blocking you?"
            />
          </div>
          <button
            onClick={submit}
            disabled={createStandup.isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition"
          >
            {createStandup.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {myStandup ? "Update standup" : "Submit standup"}
          </button>
        </div>
      </div>

      <div className="bg-white/60 border border-slate-200 rounded-2xl p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Team feed</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : standups && standups.length > 0 ? (
          <div className="space-y-3 max-h-[480px] overflow-y-auto">
            {standups.map((s: Standup) => (
              <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900">{nameFor(s.userId)}</span>
                  <span className="text-[10px] text-slate-500">{s.date.slice(0, 10)}</span>
                </div>
                {s.yesterday && <p className="text-xs text-slate-500">✅ {s.yesterday}</p>}
                {s.today && <p className="text-xs text-slate-500">▶️ {s.today}</p>}
                {s.blockers && (
                  <p className="text-xs text-red-600/80">⛔ {s.blockers}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No standups logged for this sprint yet.</p>
        )}
      </div>
    </div>
  );
}

const retroCategories: { key: RetroItem["category"]; label: string; color: string }[] = [
  { key: "went_well", label: "Went well", color: "border-emerald-500/40" },
  { key: "went_wrong", label: "Went wrong", color: "border-red-500/40" },
  { key: "action_item", label: "Action item", color: "border-amber-500/40" },
];

function RetroPanel({
  sprintId,
  currentUserId,
  userRole,
}: {
  sprintId: string;
  currentUserId: string;
  userRole: string;
}) {
  const { data: items, isLoading } = useRetros(sprintId);
  const createRetro = useCreateRetroItem();
  const updateRetro = useUpdateRetroItem();
  const deleteRetro = useDeleteRetroItem();

  const [category, setCategory] = useState<RetroItem["category"]>("went_well");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  async function add() {
    if (!content.trim()) return;
    await createRetro.mutateAsync({ sprintId, category, content: content.trim() });
    setContent("");
  }

  function startEdit(item: RetroItem) {
    setEditingId(item.id);
    setEditContent(item.content);
  }

  async function saveEdit(item: RetroItem) {
    if (!editContent.trim()) return;
    await updateRetro.mutateAsync({
      id: item.id,
      sprintId,
      content: editContent.trim(),
    });
    setEditingId(null);
    setEditContent("");
  }

  const canMutateItem = (item: RetroItem) =>
    canMutateOwned({ id: currentUserId, role: userRole }, item.authorId);

  const grouped = (cat: RetroItem["category"]) =>
    (items || []).filter((i) => i.category === cat);

  return (
    <div className="space-y-4">
      <div className="bg-white/60 border border-slate-200 rounded-2xl p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-3">Add retro item</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {retroCategories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={clsx(
                "text-xs px-3 py-1.5 rounded-lg border transition",
                category === c.key
                  ? "bg-slate-100 text-slate-900 " + c.color
                  : "text-slate-500 border-slate-200 hover:text-slate-900"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            placeholder="Share a reflection..."
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
          <button
            onClick={add}
            disabled={createRetro.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {createRetro.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-slate-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {retroCategories.map((c) => (
            <div key={c.key} className={clsx("bg-white/40 border rounded-2xl p-4", c.color)}>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">{c.label}</h4>
              <div className="space-y-2">
                {grouped(c.key).map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-start justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    {editingId === item.id ? (
                      <div className="flex-1 space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(item)}
                            disabled={updateRetro.isPending}
                            className="text-xs px-2 py-1 rounded bg-brand-500 text-white"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-slate-800">{item.content}</span>
                        {canMutateItem(item) && (
                          <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition">
                            <button
                              onClick={() => startEdit(item)}
                              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-500/10 transition"
                              aria-label="Edit retro item"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => deleteRetro.mutate({ id: item.id, sprintId })}
                              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-500/10 transition"
                              aria-label="Delete retro item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {grouped(c.key).length === 0 && (
                  <p className="text-xs text-slate-500">Nothing yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
