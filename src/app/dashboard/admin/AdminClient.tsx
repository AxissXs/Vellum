"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, X, Trash2, Shield, User as UserIcon } from "lucide-react";
import { clsx } from "clsx";
import { useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/useUsers";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
};

export default function AdminClient({
  initialUsers,
  currentUserRole,
}: {
  initialUsers: User[];
  currentUserRole: string;
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");

  function openCreate() {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("member");
    setError("");
    setShowModal(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setRole(user.role);
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (!editingUser && !password.trim()) {
      setError("Password is required for new users");
      return;
    }
    setError("");

    const createBody = {
      name: name.trim(),
      email: email.trim(),
      role,
      password: password.trim(),
    };

    const updateBody = {
      name: name.trim(),
      email: email.trim(),
      role,
      ...(password.trim() && { password: password.trim() }),
    };

    try {
      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser.id, ...updateBody });
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? { ...u, ...updateBody } : u))
        );
      } else {
        const newUser = await createUser.mutateAsync(createBody);
        setUsers((prev) => [...prev, newUser]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save user";
      setError(errorMessage);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return;

    try {
      await deleteUser.mutateAsync(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setError("Failed to delete user");
    }
  }

  const roleBadges: Record<string, string> = {
    superadmin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    admin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    member: "bg-slate-500/10 text-text-dim border-slate-500/20",
  };

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  const isLoading = createUser.isPending || updateUser.isPending || deleteUser.isPending;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">Users</h2>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-brand-600 transition"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-overlay-5 transition">
              <div className="h-9 w-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0">
                {getInitials(u.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-secondary font-medium truncate">{u.name}</p>
                <p className="text-xs text-text-dim truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border", roleBadges[u.role])}>
                  {u.role}
                </span>
                <span className="text-xs text-text-dim">{formatDate(u.createdAt)}</span>
                <button
                  onClick={() => openEdit(u)}
                  className="px-2 py-1 text-xs rounded bg-overlay-5 text-text-dim hover:text-text-primary hover:bg-overlay-10 transition"
                >
                  Edit
                </button>
                {currentUserRole === "superadmin" && (
                  <button
                    onClick={() => handleDelete(u.id)}
                    disabled={isLoading}
                    className="p-1 rounded text-text-dim hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface-card border border-border-default rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-text-primary">
                {editingUser ? "Edit User" : "Create User"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-dim hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-overlay-5 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-overlay-5 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">
                  Password {editingUser ? "(leave blank to keep current)" : ""}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-overlay-5 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-overlay-5 px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  {currentUserRole === "superadmin" && (
                    <option value="superadmin">Superadmin</option>
                  )}
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-brand-600 disabled:opacity-50 transition"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {isLoading ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
