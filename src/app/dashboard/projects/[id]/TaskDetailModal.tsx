"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Trash2, Calendar, User, Send, Edit2, Check, X as XIcon } from "lucide-react";
import { clsx } from "clsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCreateComment, useUpdateComment, useDeleteComment } from "@/hooks/useComments";
import { useRealtime } from "@/hooks/useRealtime";
import RichTextEditor, { RichTextPreview } from "@/components/RichTextEditor";
import { hasPermission } from "@/lib/permissions";

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
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
  assigneeAvatar: string | null;
};

type Comment = {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  authorAvatar: string | null;
};

const priorityBadges: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-600 border-red-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

async function fetchComments(taskId: string) {
  const data = await api.get<{ comments: Comment[] }>(`/api/comments?taskId=${taskId}`);
  return data.comments;
}

export default function TaskDetailModal({
  task: initialTask,
  users,
  currentUserId,
  userRole = "member",
  onClose,
  onChange,
}: {
  task: Task;
  users: User[];
  currentUserId: string;
  userRole?: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const canEdit = hasPermission(userRole, "edit_tasks");
  const canDelete = hasPermission(userRole, "delete_tasks");
  const canAssign = hasPermission(userRole, "assign_tasks");
  const [task, setTask] = useState(initialTask);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editStatus, setEditStatus] = useState(task.status);
  const [editAssignee, setEditAssignee] = useState(task.assigneeId || "");
  const [editDueDate, setEditDueDate] = useState(task.dueDate?.split("T")[0] || "");

  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  const queryClient = useQueryClient();
  const { data: comments = [], refetch } = useQuery({
    queryKey: ["comments", task.id],
    queryFn: () => fetchComments(task.id),
  });

  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

  // Subscribe to real-time comment and task updates
  useRealtime(undefined, task.id);

  useEffect(() => {
    refetch();
  }, [task.id, refetch]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        priority: editPriority,
        status: editStatus,
        assigneeId: editAssignee || null,
        dueDate: editDueDate || null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setTask(data.task);
      setEditing(false);
      onChange();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this task? This action cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) {
      onChange();
      onClose();
    }
    setDeleting(false);
  }

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    createCommentMutation.mutate({ content: newComment.trim(), taskId: task.id }, {
      onSuccess: () => setNewComment(""),
    });
  }

  function startEditComment(comment: Comment) {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditCommentContent("");
  }

  function saveEditComment(comment: Comment) {
    updateCommentMutation.mutate(
      { id: comment.id, taskId: comment.taskId, content: editCommentContent.trim() },
      { onSuccess: () => cancelEditComment() }
    );
  }

  function handleDeleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    deleteCommentMutation.mutate(commentId);
  }

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[85dvh] flex flex-col shadow-lg animate-slide-in">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            ) : (
              <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border", priorityBadges[task.priority])}>
                {task.priority}
              </span>
              <span className="text-xs text-slate-500">Created {formatDate(task.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              !editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-slate-50 text-slate-500 hover:text-slate-900 transition"
                  >
                    Cancel
                  </button>
                </>
              )
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-500/10 transition"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Status</label>
              {editing ? (
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              ) : (
                <p className="text-sm text-slate-600 capitalize">{task.status.replace("_", " ")}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-1">Priority</label>
              {editing ? (
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              ) : (
                <p className="text-sm text-slate-600 capitalize">{task.priority}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-1">Assignee</label>
              {editing && canAssign ? (
                <select
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-600">
                  {task.assigneeName || <span className="text-slate-600">Unassigned</span>}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-1">Due Date</label>
              {editing ? (
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              ) : (
                <p className="text-sm text-slate-600">
                  {task.dueDate ? formatDate(task.dueDate) : <span className="text-slate-600">None</span>}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            {editing ? (
              <RichTextEditor
                label="Description"
                value={editDescription}
                onChange={setEditDescription}
                rows={6}
                placeholder="Add context, acceptance criteria, links, or implementation notes..."
              />
            ) : (
              <>
                <label className="text-xs text-slate-500 block mb-1">Description</label>
                <RichTextPreview value={task.description || ""} empty="No description" />
              </>
            )}
          </div>

          {/* Comments */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Comments ({comments.length})
            </h4>

            <div className="space-y-3 mb-4">
              {comments.length === 0 && (
                <p className="text-sm text-slate-600 text-center py-4">No comments yet</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-[10px] font-bold text-brand-600 shrink-0">
                    {getInitials(c.authorName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingCommentId === c.id ? (
                      <form onSubmit={(e) => { e.preventDefault(); saveEditComment(c); }} className="space-y-2">
                        <RichTextEditor
                          value={editCommentContent}
                          onChange={setEditCommentContent}
                          rows={3}
                          placeholder="Edit your comment..."
                          users={users}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={cancelEditComment}
                            className="px-3 py-1.5 text-xs rounded-lg bg-slate-50 text-slate-500 hover:text-slate-900 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={updateCommentMutation.isPending || !editCommentContent.trim()}
                            className="px-3 py-1.5 text-xs rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition"
                          >
                            {updateCommentMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-600">{c.authorName || "Unknown"}</span>
                          <span className="text-[10px] text-slate-600">{formatTime(c.createdAt)}</span>
                          {c.authorId === currentUserId && (
                            <div className="flex items-center gap-1 ml-auto">
                              <button
                                onClick={() => startEditComment(c)}
                                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-500/10 transition"
                                title="Edit"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                disabled={deleteCommentMutation.isPending}
                                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-500/10 transition"
                                title="Delete"
                              >
                                {deleteCommentMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="mt-0.5">
                          <RichTextPreview value={c.content} empty="" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="space-y-2">
              <RichTextEditor
                value={newComment}
                onChange={setNewComment}
                rows={3}
                placeholder="Write an update, decision, blocker, or link..."
                users={users}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createCommentMutation.isPending || !newComment.trim()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition"
                >
                  {createCommentMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Add comment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}