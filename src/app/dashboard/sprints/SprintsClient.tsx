"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Loader2,
  X,
  Calendar,
  Flag,
  Trash2,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { clsx } from "clsx";
import { useCreateSprint, useUpdateSprint, useDeleteSprint } from "@/hooks/useSprints";
import type { Sprint } from "@/hooks/useSprints";
import { hasPermission } from "@/lib/permissions";

type Project = { id: string; name: string; color: string | null };

const statusStyles: Record<string, string> = {
  planned: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export default function SprintsClient({
  projects,
  userRole,
}: {
  projects: Project[];
  userRole: string;
}) {
  const canCreate = hasPermission(userRole, "create_sprints");
  const canEdit = hasPermission(userRole, "edit_sprints");
  const canDelete = hasPermission(userRole, "delete_sprints");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");

  const createSprint = useCreateSprint();
  const updateSprint = useUpdateSprint();
  const deleteSprint = useDeleteSprint();

  async function loadSprints(pid: string) {
    if (!pid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sprints?projectId=${pid}`);
      const data = await res.json();
      setSprints(data.sprints || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSprints(projectId);
  }, [projectId]);

  function openCreateModal() {
    setEditingSprint(null);
    setName("");
    setGoal("");
    setStartDate("");
    setEndDate("");
    setDateError("");
    setShowModal(true);
  }

  function openEditModal(sprint: Sprint) {
    setEditingSprint(sprint);
    setName(sprint.name);
    setGoal(sprint.goal || "");
    setStartDate(sprint.startDate?.slice(0, 10) || "");
    setEndDate(sprint.endDate?.slice(0, 10) || "");
    setDateError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingSprint(null);
    setDateError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !projectId || !startDate || !endDate) return;
    if (endDate < startDate) {
      setDateError("End date must be on or after start date.");
      return;
    }

    const details = {
      projectId,
      name: name.trim(),
      goal: goal.trim() || null,
      startDate,
      endDate,
    };

    if (editingSprint) {
      await updateSprint.mutateAsync({ ...details, id: editingSprint.id });
    } else {
      await createSprint.mutateAsync({ ...details, status: "planned" });
    }

    closeModal();
    loadSprints(projectId);
  }

  async function handleSetActive(sprint: Sprint) {
    await updateSprint.mutateAsync({
      id: sprint.id,
      projectId: sprint.projectId,
      status: "active",
    });
    loadSprints(projectId);
  }

  async function handleDelete(sprint: Sprint) {
    if (!confirm(`Delete sprint "${sprint.name}"?`)) return;
    await deleteSprint.mutateAsync({ id: sprint.id, projectId: sprint.projectId });
    loadSprints(projectId);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {canCreate && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
          >
            <Plus size={16} />
            New Sprint
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : sprints.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl py-16 text-center">
          <p className="text-slate-500">No sprints yet for this project.</p>
          {canCreate && (
            <button
              onClick={openCreateModal}
              className="mt-3 text-sm text-brand-600 hover:underline"
            >
              Create the first sprint
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className="bg-white/60 border border-slate-200 rounded-2xl p-5 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/dashboard/sprints/${sprint.id}`}
                  className="text-base font-semibold text-slate-900 hover:text-brand-600 transition"
                >
                  {sprint.name}
                </Link>
                <span
                  className={clsx(
                    "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
                    statusStyles[sprint.status] || statusStyles.planned
                  )}
                >
                  {sprint.status}
                </span>
              </div>

              {sprint.goal && (
                <p className="mt-2 text-sm text-slate-500 line-clamp-2">{sprint.goal}</p>
              )}

              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar size={12} />
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

              {(canEdit || canDelete) && (
                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-200">
                  {canEdit && sprint.status !== "active" && (
                    <button
                      onClick={() => handleSetActive(sprint)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/20 transition"
                    >
                      <CheckCircle2 size={13} />
                      Set active
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => openEditModal(sprint)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-500/10 transition"
                      title="Edit sprint"
                      aria-label={`Edit ${sprint.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(sprint)}
                      className="ml-auto p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-500/10 transition"
                      title="Delete sprint"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (editingSprint ? canEdit : canCreate) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingSprint ? "Edit Sprint" : "New Sprint"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Sprint 1 — Core Experience"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Goal (optional)
                </label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="What should this sprint achieve?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Start date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateError("");
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    End date
                  </label>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateError("");
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              {dateError && <p className="text-sm text-red-600">{dateError}</p>}

              <button
                type="submit"
                disabled={createSprint.isPending || updateSprint.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition"
              >
                {createSprint.isPending || updateSprint.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  editingSprint ? <Pencil size={16} /> : <Flag size={16} />
                )}
                {createSprint.isPending || updateSprint.isPending
                  ? "Saving..."
                  : editingSprint
                    ? "Save Changes"
                    : "Create Sprint"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
