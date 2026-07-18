"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Loader2, Trash2, Calendar, Send, Edit2,
  Check, MessageCircle, Pencil, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCreateComment, useUpdateComment, useDeleteComment } from "@/hooks/useComments";
import { useRealtime } from "@/hooks/useRealtime";
import RichTextEditor, { RichTextPreview } from "@/components/RichTextEditor";
import TaskAssigneePopover from "@/components/TaskAssigneePopover";

type UserInfo = { id: string; name: string; avatarUrl: string | null };
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
  projectName?: string | null;
  projectColor?: string | null;
};

type Comment = {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  authorAvatar: string | null;
};

const STATUS_CONFIG: { key: string; label: string; color: string; dot: string }[] = [
  { key: "backlog", label: "Backlog", color: "bg-slate-500/10 text-slate-400 border-slate-500/20", dot: "bg-slate-500" },
  { key: "todo", label: "To Do", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-500" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-500" },
  { key: "review", label: "Review", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", dot: "bg-purple-500" },
  { key: "done", label: "Done", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
];

const PRIORITY_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "low", label: "Low", color: "bg-emerald-500" },
  { key: "medium", label: "Medium", color: "bg-amber-500" },
  { key: "high", label: "High", color: "bg-orange-500" },
  { key: "urgent", label: "Urgent", color: "bg-red-500" },
];

const PriorityBadge: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

async function fetchComments(taskId: string) {
  const data = await api.get<{ comments: Comment[] }>(`/api/comments?taskId=${taskId}`);
  return data.comments;
}

function useKeyboardShortcuts({
  onClose,
  editing,
  setEditing,
  replyingToId,
  setReplyingToId,
}: {
  onClose: () => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  replyingToId: string | null;
  setReplyingToId: (v: string | null) => void;
}) {
  useEffect(() => {
    function isInputActive() {
      const target = document.activeElement;
      if (!target) return false;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        (target as HTMLElement).isContentEditable
      );
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (editing) { setEditing(false); return; }
        if (replyingToId) { setReplyingToId(null); return; }
        onClose();
        return;
      }
      if (e.key.toLowerCase() === "e" && !editing && !isInputActive()) {
        e.preventDefault();
        setEditing(true);
        return;
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, editing, setEditing, replyingToId, setReplyingToId]);
}

export default function TaskDetailModal({
  task: initialTask,
  users,
  currentUserId,
  onClose,
  onChange,
  onDelete,
}: {
  task: Task;
  users: UserInfo[];
  currentUserId: string;
  onClose: () => void;
  onChange: () => void;
  onDelete?: (taskId: string) => void;
}) {
  const [task, setTask] = useState(initialTask);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editStatus, setEditStatus] = useState(task.status);
  const [editAssignee, setEditAssignee] = useState(task.assigneeId || "");
  const [editDueDate, setEditDueDate] = useState(task.dueDate?.split("T")[0] || "");

  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const queryClient = useQueryClient();
  const { data: comments = [], refetch } = useQuery({
    queryKey: ["comments", task.id],
    queryFn: () => fetchComments(task.id),
  });

  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

  useRealtime(undefined, task.id);

  useEffect(() => { refetch(); }, [task.id, refetch]);
  useKeyboardShortcuts({ onClose, editing, setEditing, replyingToId, setReplyingToId });

  // Close assignee dropdown when clicking outside
  useEffect(() => {
    if (!showAssigneeDropdown) return;
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-assignee-dropdown]")) {
        setShowAssigneeDropdown(false);
        setAssigneeSearch("");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showAssigneeDropdown]);

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
      onDelete?.(task.id);
      onChange();
      onClose();
    }
    setDeleting(false);
  }

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    createCommentMutation.mutate(
      { content: newComment.trim(), taskId: task.id, parentId: null },
      { onSuccess: () => setNewComment("") }
    );
  }

  function handleAddReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim() || !replyingToId) return;
    createCommentMutation.mutate(
      { content: replyContent.trim(), taskId: task.id, parentId: replyingToId },
      { onSuccess: () => { setReplyContent(""); setReplyingToId(null); } }
    );
  }

  function startEditComment(comment: Comment) {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
    setReplyingToId(null);
    setReplyContent("");
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

  const getInitials = useCallback((name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, []);

  const formatRelative = useCallback((dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  const topLevelComments = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parentId) {
      const list = repliesByParent.get(c.parentId) || [];
      list.push(c);
      repliesByParent.set(c.parentId, list);
    }
  }
  const totalReplyCount = comments.filter((c) => c.parentId).length;

  const statusCfg = STATUS_CONFIG.find((s) => s.key === task.status) || STATUS_CONFIG[0];
  const priorityCfg = PRIORITY_CONFIG.find((p) => p.key === task.priority) || PRIORITY_CONFIG[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 border border-white/10 md:rounded-2xl w-full max-w-4xl h-full md:h-auto md:max-h-[85vh] flex flex-col shadow-2xl animate-slide-in overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 md:p-6 border-b border-white/5 gap-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-white break-words">{task.title}</h3>
                <span className={clsx("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border shrink-0", statusCfg.color)}>
                  <span className={clsx("inline-block h-1.5 w-1.5 rounded-full mr-1", statusCfg.dot)} />
                  {statusCfg.label}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-slate-500">
              <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border", PriorityBadge[task.priority])}>{task.priority}</span>
              <span>Created {formatDate(task.createdAt)}</span>
              {task.projectName && (
                <a href={`/dashboard/projects/${task.projectId}`} className="inline-flex items-center gap-1 text-slate-400 hover:text-brand-400 transition" onClick={(e) => e.stopPropagation()}>
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: task.projectColor || "#6366f1" }} />
                  {task.projectName}
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!editing ? (
              <>
                <button onClick={() => setEditing(true)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition" title="Edit (E)"><Pencil size={14} /></button>

              </>
            ) : (
              <>
                <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition">{saving ? <Loader2 size={12} className="animate-spin" /> : "Save"}</button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-slate-400 hover:text-white transition">Cancel</button>
              </>
            )}
            <button onClick={handleDelete} disabled={deleting} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition" title="Delete"><Trash2 size={14} /></button>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white transition"><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:grid md:grid-cols-5 md:gap-0">
            {/* Left: Details */}
            <div className="md:col-span-3 p-5 md:p-6 space-y-6 border-b md:border-b-0 md:border-r border-white/5">
              {/* Assignee + Due Date */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-[11px] uppercase tracking-wider text-slate-600 block mb-1.5">Assignee</label>
                  {editing ? (
                    <div className="relative" data-assignee-dropdown>
                      <button
                        onClick={() => setShowAssigneeDropdown((v) => !v)}
                        className="w-full flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/[0.07] transition"
                      >
                        <div className="flex items-center gap-2">
                          {editAssignee ? (
                            <>
                              <div className="h-5 w-5 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-[9px] font-bold text-brand-400">{getInitials(users.find((u) => u.id === editAssignee)?.name || "?")}</div>
                              <span>{users.find((u) => u.id === editAssignee)?.name || "Unknown"}</span>
                            </>
                          ) : (
                            <span className="text-slate-500">Unassigned</span>
                          )}
                        </div>
                        <ChevronDown size={14} className="text-slate-500" />
                      </button>
                      {showAssigneeDropdown && (
                        <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-2 max-h-64 overflow-hidden animate-slide-in">
                          <div className="px-2 pb-2">
                            <input
                              type="text"
                              value={assigneeSearch}
                              onChange={(e) => setAssigneeSearch(e.target.value)}
                              placeholder="Search users..."
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                              autoFocus
                            />
                          </div>
                          <div className="overflow-y-auto max-h-48 px-1">
                            <button
                              onClick={() => { setEditAssignee(""); setShowAssigneeDropdown(false); setAssigneeSearch(""); }}
                              className={clsx("w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition", editAssignee === "" ? "bg-brand-500/10 text-brand-400" : "text-slate-300 hover:bg-white/5")}
                            >
                              <div className="h-5 w-5 rounded-full bg-slate-800 border border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-[9px]">—</div>
                              Unassigned
                            </button>
                            {users
                              .filter((u) => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                              .map((u) => (
                                <button
                                  key={u.id}
                                  onClick={() => { setEditAssignee(u.id); setShowAssigneeDropdown(false); setAssigneeSearch(""); }}
                                  className={clsx("w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition", editAssignee === u.id ? "bg-brand-500/10 text-brand-400" : "text-slate-300 hover:bg-white/5")}
                                >
                                  <div className="h-5 w-5 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-[9px] font-bold text-brand-400">{getInitials(u.name)}</div>
                                  {u.name}
                                  {editAssignee === u.id && <Check size={12} className="ml-auto" />}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <TaskAssigneePopover
                        taskId={task.id}
                        currentAssigneeId={task.assigneeId}
                        users={users}
                        onAssigneeChange={(id) => setTask((t) => ({ ...t, assigneeId: id, assigneeName: users.find((u) => u.id === id)?.name || null }))}
                        size="md"
                      />
                      {task.assigneeName ? (
                        <span className="text-sm text-slate-200">{task.assigneeName}</span>
                      ) : <span className="text-sm text-slate-600">Unassigned</span>}
                    </div>
                  )}
                </div>
                <div className="sm:w-40">
                  <label className="text-[11px] uppercase tracking-wider text-slate-600 block mb-1.5">Due Date</label>
                  {editing ? (
                    <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm text-slate-300"><Calendar size={14} className="text-slate-500" />{task.dueDate ? formatDate(task.dueDate) : <span className="text-slate-600">None</span>}</div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-600 block mb-1.5">Status</label>
                {editing ? (
                  <div className="flex flex-wrap gap-2">
                    {STATUS_CONFIG.map((s) => (
                      <button key={s.key} onClick={() => setEditStatus(s.key)} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition", editStatus === s.key ? s.color : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10")}>
                        <span className={clsx("h-2 w-2 rounded-full", s.dot)} />{s.label}{editStatus === s.key && <Check size={12} className="ml-1" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5"><span className={clsx("h-2.5 w-2.5 rounded-full", statusCfg.dot)} /><span className="text-sm text-slate-200">{statusCfg.label}</span></div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-600 block mb-1.5">Priority</label>
                {editing ? (
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY_CONFIG.map((p) => (
                      <button key={p.key} onClick={() => setEditPriority(p.key)} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition", editPriority === p.key ? PriorityBadge[p.key] : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10")}>
                        <span className={clsx("h-2.5 w-2.5 rounded-full", p.color)} />{p.label}{editPriority === p.key && <Check size={12} className="ml-1" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5"><span className={clsx("h-2.5 w-2.5 rounded-full", priorityCfg.color)} /><span className="text-sm text-slate-200">{priorityCfg.label}</span></div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-600 block mb-1.5">Description</label>
                {editing ? (
                  <RichTextEditor value={editDescription} onChange={setEditDescription} rows={6} placeholder="Add context, acceptance criteria, links, or implementation notes..." />
                ) : (
                  <RichTextPreview value={task.description || ""} empty="No description" />
                )}
              </div>

              {/* Footer meta */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Calendar size={12} />
                  <span>Created {formatDate(task.createdAt)} · Updated {formatRelative(task.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Right: Activity */}
            <div className="md:col-span-2 p-5 md:p-6 space-y-5 bg-slate-950/30">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageCircle size={16} className="text-brand-400" />
                Activity
                <span className="text-xs text-slate-600 font-normal">{comments.length - totalReplyCount}{totalReplyCount > 0 ? ` + ${totalReplyCount} repl${totalReplyCount === 1 ? "y" : "ies"}` : ""}</span>
              </h4>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {topLevelComments.length === 0 && <p className="text-sm text-slate-600 text-center py-4">No activity yet</p>}
                {topLevelComments.map((c) => {
                  const replies = repliesByParent.get(c.id) || [];
                  return (
                    <div key={c.id} className="space-y-2">
                      {/* Comment */}
                      <div className="flex gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-[10px] font-bold text-brand-400 flex-shrink-0">{getInitials(c.authorName)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-medium text-slate-200 truncate">{c.authorName || "Unknown"}</span>
                              <span className="text-[10px] text-slate-600 shrink-0">{formatRelative(c.createdAt)}</span>
                            </div>
                            {c.authorId === currentUserId && editingCommentId !== c.id && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => startEditComment(c)} className="p-1 rounded text-slate-500 hover:text-brand-400 hover:bg-brand-500/10 transition" title="Edit"><Edit2 size={10} /></button>
                                <button onClick={() => handleDeleteComment(c.id)} disabled={deleteCommentMutation.isPending} className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition" title="Delete">{deleteCommentMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}</button>
                              </div>
                            )}
                          </div>

                          {editingCommentId === c.id ? (
                            <form onSubmit={(e) => { e.preventDefault(); saveEditComment(c); }} className="mt-1.5 space-y-2">
                              <RichTextEditor value={editCommentContent} onChange={setEditCommentContent} rows={3} placeholder="Edit your comment..." users={users} />
                              <div className="flex gap-2 justify-end">
                                <button type="button" onClick={cancelEditComment} className="px-2.5 py-1 text-[11px] rounded bg-white/5 text-slate-400 hover:text-white transition">Cancel</button>
                                <button type="submit" disabled={updateCommentMutation.isPending || !editCommentContent.trim()} className="px-2.5 py-1 text-[11px] rounded bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition">{updateCommentMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : "Save"}</button>
                              </div>
                            </form>
                          ) : (
                            <div className="mt-1"><RichTextPreview value={c.content} empty="" /></div>
                          )}

                          {editingCommentId !== c.id && (
                            <button onClick={() => { setReplyingToId(replyingToId === c.id ? null : c.id); setReplyContent(""); }} className="text-[11px] text-slate-500 hover:text-brand-400 transition mt-1">
                              {replyingToId === c.id ? "Cancel reply" : replies.length > 0 ? `Reply (${replies.length})` : "Reply"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reply form */}
                      {replyingToId === c.id && editingCommentId !== c.id && (
                        <form onSubmit={handleAddReply} className="ml-9 space-y-2">
                          <RichTextEditor value={replyContent} onChange={setReplyContent} rows={2} placeholder={`Reply to ${c.authorName || "Unknown"}...`} users={users} />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => { setReplyingToId(null); setReplyContent(""); }} className="px-2.5 py-1 text-[11px] rounded bg-white/5 text-slate-400 hover:text-white transition">Cancel</button>
                            <button type="submit" disabled={createCommentMutation.isPending || !replyContent.trim()} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand-500 text-[11px] font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition">{createCommentMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}Reply</button>
                          </div>
                        </form>
                      )}

                      {/* Nested replies */}
                      {replies.length > 0 && (
                        <div className="ml-4 pl-4 border-l-2 border-white/5 space-y-3">
                          {replies.map((reply) => (
                            <div key={reply.id} className="flex gap-2">
                              <div className="h-5 w-5 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-[8px] font-bold text-brand-400 flex-shrink-0 mt-0.5">{getInitials(reply.authorName)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-xs font-medium text-slate-200 truncate">{reply.authorName || "Unknown"}</span>
                                    <span className="text-[10px] text-slate-600 shrink-0">{formatRelative(reply.createdAt)}</span>
                                  </div>
                                  {reply.authorId === currentUserId && editingCommentId !== reply.id && (
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <button onClick={() => startEditComment(reply)} className="p-0.5 rounded text-slate-500 hover:text-brand-400 hover:bg-brand-500/10 transition" title="Edit"><Edit2 size={10} /></button>
                                      <button onClick={() => handleDeleteComment(reply.id)} disabled={deleteCommentMutation.isPending} className="p-0.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition" title="Delete">{deleteCommentMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}</button>
                                    </div>
                                  )}
                                </div>
                                {editingCommentId === reply.id ? (
                                  <form onSubmit={(e) => { e.preventDefault(); saveEditComment(reply); }} className="mt-1 space-y-2">
                                    <RichTextEditor value={editCommentContent} onChange={setEditCommentContent} rows={3} placeholder="Edit your reply..." users={users} />
                                    <div className="flex gap-2 justify-end">
                                      <button type="button" onClick={cancelEditComment} className="px-2.5 py-1 text-[11px] rounded bg-white/5 text-slate-400 hover:text-white transition">Cancel</button>
                                      <button type="submit" disabled={updateCommentMutation.isPending || !editCommentContent.trim()} className="px-2.5 py-1 text-[11px] rounded bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition">{updateCommentMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : "Save"}</button>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="mt-0.5"><RichTextPreview value={reply.content} empty="" /></div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Comment form */}
              <form onSubmit={handleAddComment} className="space-y-2 pt-2 border-t border-white/5">
                <RichTextEditor value={newComment} onChange={setNewComment} rows={3} placeholder="Write an update, decision, blocker, or link..." users={users} />
                <div className="flex justify-end">
                  <button type="submit" disabled={createCommentMutation.isPending || !newComment.trim()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition">{createCommentMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}Add comment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
