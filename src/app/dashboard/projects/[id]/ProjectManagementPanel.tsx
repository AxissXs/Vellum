"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Flag, Loader2, Plus, Save, ShieldAlert, Target, Trash2, Users } from "lucide-react";
import { clsx } from "clsx";
import RichTextEditor, { RichTextPreview } from "@/components/RichTextEditor";
import {
  useUpdateProject,
  useDeleteProject,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from "@/hooks/useProjects";
import { toast } from "sonner";

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

type UserOption = { id: string; name: string; avatarUrl: string | null };
type Member = {
  userId: string | null;
  name: string | null;
  role?: string | null;
  openTasks: number;
  doneTasks: number;
};

const statusBadges: Record<string, string> = {
  planning: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  active: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  paused: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const healthBadges: Record<string, string> = {
  on_track: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  watching: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  at_risk: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function ProjectManagementPanel({
  project,
  initialMilestones,
  users,
  members,
  completionRate,
  canEdit = false,
  canDelete = false,
}: {
  project: Project;
  initialMilestones: Milestone[];
  users: UserOption[];
  members: Member[];
  completionRate: number;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [milestones, setMilestones] = useState(initialMilestones);

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createMilestoneMutation = useCreateMilestone();
  const updateMilestoneMutation = useUpdateMilestone();
  const deleteMilestoneMutation = useDeleteMilestone();

  const [status, setStatus] = useState(project.status);
  const [health, setHealth] = useState(project.health);
  const [visibility, setVisibility] = useState(project.visibility);
  const [goal, setGoal] = useState(project.goal || "");
  const [keyResults, setKeyResults] = useState(project.keyResults || "");
  const [risks, setRisks] = useState(project.risks || "");
  const [startDate, setStartDate] = useState(project.startDate?.split("T")[0] || "");
  const [targetDate, setTargetDate] = useState(project.targetDate?.split("T")[0] || "");

  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");
  const [milestoneOwner, setMilestoneOwner] = useState("");

  const nextMilestone = useMemo(() => {
    return milestones
      .filter((milestone) => milestone.status !== "done")
      .sort((a, b) => new Date(a.dueDate || "2999-01-01").getTime() - new Date(b.dueDate || "2999-01-01").getTime())[0];
  }, [milestones]);

  async function saveProject() {
    if (!canEdit) return;
    try {
      await updateProject.mutateAsync({
        id: project.id,
        status,
        health,
        visibility,
        goal: goal.trim() || null,
        keyResults: keyResults.trim() || null,
        risks: risks.trim() || null,
        startDate: startDate || null,
        targetDate: targetDate || null,
      });
      toast.success("Project saved");
      router.refresh();
    } catch {
      toast.error("Failed to save project");
    }
  }

  async function handleDeleteProject() {
    if (!canDelete) return;
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      await deleteProject.mutateAsync(project.id);
      toast.success("Project deleted");
      router.push("/dashboard/projects");
    } catch {
      toast.error("Failed to delete project");
    }
  }

  async function createMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || !milestoneTitle.trim()) return;

    try {
      const milestone = await createMilestoneMutation.mutateAsync({
        projectId: project.id,
        title: milestoneTitle.trim(),
        description: milestoneDescription.trim() || null,
        dueDate: milestoneDueDate || null,
        ownerId: milestoneOwner || null,
      });
      setMilestones((prev) => [
        ...prev,
        {
          id: milestone.id,
          title: milestone.title,
          description: milestone.description,
          status: milestone.status,
          dueDate: milestone.dueDate,
          ownerId: milestone.ownerId,
        },
      ]);
      setMilestoneTitle("");
      setMilestoneDescription("");
      setMilestoneDueDate("");
      setMilestoneOwner("");
      router.refresh();
    } catch {
      toast.error("Failed to create milestone");
    }
  }

  async function updateMilestone(id: string, patch: Partial<Milestone>) {
    if (!canEdit) return;
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    try {
      await updateMilestoneMutation.mutateAsync({
        id,
        projectId: project.id,
        ...patch,
      });
      router.refresh();
    } catch {
      toast.error("Failed to update milestone");
      router.refresh();
    }
  }

  async function deleteMilestone(id: string) {
    if (!canEdit) return;
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteMilestoneMutation.mutateAsync(id);
      router.refresh();
    } catch {
      toast.error("Failed to delete milestone");
      router.refresh();
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "No date";
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2);
  }

  const fieldDisabled = !canEdit;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Project Command Center</h2>
              <p className="text-sm text-slate-500">Goals, health, risks, dates, and delivery checkpoints.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canDelete && (
                <button
                  onClick={handleDeleteProject}
                  disabled={deleteProject.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/20 disabled:opacity-50 transition"
                >
                  {deleteProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Delete
                </button>
              )}
              {canEdit && (
                <button
                  onClick={saveProject}
                  disabled={updateProject.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition"
                >
                  {updateProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save plan
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <label className="block">
              <span className="text-xs text-slate-500">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={fieldDisabled} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60">
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Health</span>
              <select value={health} onChange={(e) => setHealth(e.target.value)} disabled={fieldDisabled} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60">
                <option value="on_track">On track</option>
                <option value="watching">Watching</option>
                <option value="at_risk">At risk</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Visibility</span>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} disabled={fieldDisabled} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60">
                <option value="team">Team</option>
                <option value="company">Company</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Start date</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={fieldDisabled} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Target date</span>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} disabled={fieldDisabled} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60" />
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">Delivery progress</span>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${completionRate}%` }} />
                </div>
                <span className="text-sm font-semibold text-slate-900">{completionRate}%</span>
              </div>
            </div>
          </div>

          {canEdit ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RichTextEditor label="Project goal" value={goal} onChange={setGoal} rows={5} placeholder="What outcome should this project deliver?" />
                <RichTextEditor label="Key results" value={keyResults} onChange={setKeyResults} rows={5} placeholder="- Increase activation by 15%\n- Reduce cycle time by 20%" />
              </div>
              <div className="mt-4">
                <RichTextEditor label="Risks & mitigations" value={risks} onChange={setRisks} rows={4} placeholder="Capture blockers, dependencies, mitigation plans, and decisions." />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Project goal</p>
                <RichTextPreview value={goal} empty="No project goal captured yet" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Key results</p>
                <RichTextPreview value={keyResults} empty="No key results" />
              </div>
              <div className="lg:col-span-2">
                <p className="text-xs text-slate-500 mb-1">Risks & mitigations</p>
                <RichTextPreview value={risks} empty="No active risks captured" />
              </div>
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Milestones</h2>
              <p className="text-sm text-slate-500">Track important checkpoints and delivery dates.</p>
            </div>
            <span className="text-xs rounded-full bg-slate-100 px-2 py-1 text-slate-500">{milestones.length} total</span>
          </div>

          {canEdit && (
            <form onSubmit={createMilestone} className="mb-5 rounded-xl border border-slate-200 bg-slate-100 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} placeholder="Milestone title" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <input type="date" value={milestoneDueDate} onChange={(e) => setMilestoneDueDate(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <select value={milestoneOwner} onChange={(e) => setMilestoneOwner(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">No owner</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </div>
              <RichTextEditor value={milestoneDescription} onChange={setMilestoneDescription} rows={3} placeholder="Milestone definition of done, scope, or dependencies..." />
              <button disabled={createMilestoneMutation.isPending || !milestoneTitle.trim()} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-white/15 disabled:opacity-50 transition">
                {createMilestoneMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add milestone
              </button>
            </form>
          )}

          <div className="space-y-3">
            {milestones.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <Flag className="mx-auto mb-3 text-slate-600" size={28} />
                <p className="text-sm text-slate-500">
                  {canEdit
                    ? "No milestones yet. Add the first delivery checkpoint above."
                    : "No milestones yet."}
                </p>
              </div>
            ) : milestones.map((milestone) => (
              <div key={milestone.id} className="rounded-xl border border-slate-200 bg-slate-100 p-4">
                <div className="flex items-start gap-3">
                  {canEdit ? (
                    <button
                      onClick={() => updateMilestone(milestone.id, { status: milestone.status === "done" ? "planned" : "done" })}
                      className={clsx("mt-0.5 h-5 w-5 rounded-full border shrink-0", milestone.status === "done" ? "bg-emerald-500 border-emerald-500" : "border-slate-600")}
                      aria-label="Toggle milestone status"
                    />
                  ) : (
                    <div
                      className={clsx("mt-0.5 h-5 w-5 rounded-full border shrink-0", milestone.status === "done" ? "bg-emerald-500 border-emerald-500" : "border-slate-600")}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={clsx("text-sm font-semibold", milestone.status === "done" ? "text-slate-500 line-through" : "text-slate-900")}>{milestone.title}</h3>
                      <span className="text-[10px] uppercase tracking-wider rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">{milestone.status}</span>
                    </div>
                    <div className="mt-2">
                      <RichTextPreview value={milestone.description || ""} empty="No details" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Calendar size={12} /> {formatDate(milestone.dueDate)}</span>
                      <span>Owner: {users.find((user) => user.id === milestone.ownerId)?.name || "Unassigned"}</span>
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => deleteMilestone(milestone.id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-600 transition">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Executive Snapshot</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Status</span>
              <span className={clsx("text-[10px] uppercase tracking-wider rounded border px-2 py-1", statusBadges[status] || statusBadges.active)}>{status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Health</span>
              <span className={clsx("text-[10px] uppercase tracking-wider rounded border px-2 py-1", healthBadges[health] || healthBadges.on_track)}>{health.replace("_", " ")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Next milestone</span>
              <span className="text-sm text-slate-600 text-right">{nextMilestone?.title || "None"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Target</span>
              <span className="text-sm text-slate-600">{formatDate(targetDate || null)}</span>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-brand-600" />
            <h2 className="text-lg font-semibold text-slate-900">Workload</h2>
          </div>
          <div className="space-y-3">
            {members.length === 0 ? (
              <p className="text-sm text-slate-500">No assignees yet.</p>
            ) : members.map((member) => {
              const total = member.openTasks + member.doneTasks;
              const donePct = total > 0 ? Math.round((member.doneTasks / total) * 100) : 0;
              return (
                <div key={member.userId || member.name || "unassigned"} className="rounded-lg bg-slate-50/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-[11px] font-bold text-brand-600">{getInitials(member.name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900 truncate">{member.name || "Unassigned"}</p>
                      <p className="text-xs text-slate-500">{member.openTasks} open · {member.doneTasks} done</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${donePct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target size={18} className="text-emerald-600" />
            <h2 className="font-semibold text-slate-900">Goal preview</h2>
          </div>
          <RichTextPreview value={goal} empty="No project goal captured yet" />
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={18} className="text-amber-600" />
            <h2 className="font-semibold text-slate-900">Risk preview</h2>
          </div>
          <RichTextPreview value={risks} empty="No active risks captured" />
        </section>
      </aside>
    </div>
  );
}
