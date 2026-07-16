"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, X } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { useCreateProject } from "@/hooks/useProjects";

export default function ProjectListClient({
  userRole,
  currentUserId,
}: {
  userRole: string;
  currentUserId: string;
}) {
  const canCreate = hasPermission(userRole, "create_projects");
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [error, setError] = useState("");
  const router = useRouter();
  const createProject = useCreateProject();

  const colors = [
    "#6366f1", "#ec4899", "#10b981", "#f59e0b",
    "#8b5cf6", "#06b6d4", "#f43f5e", "#84cc16",
  ];

  if (!canCreate) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");

    try {
      await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        color,
        ownerId: currentUserId,
      });
      setShowModal(false);
      setName("");
      setDescription("");
      setColor("#6366f1");
      router.refresh();
    } catch {
      setError("Failed to create project");
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
      >
        <Plus size={16} />
        New Project
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-lg animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Create Project</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-red-600 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Project name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Brief description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Color</label>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="h-8 w-8 rounded-lg transition-all"
                      style={{
                        backgroundColor: c,
                        outline: color === c ? "2px solid white" : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={createProject.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition"
              >
                {createProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {createProject.isPending ? "Creating..." : "Create Project"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
