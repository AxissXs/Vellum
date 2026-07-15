"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2, UserPlus, Users, X } from "lucide-react";
import { clsx } from "clsx";

type UserOption = { id: string; name: string; email?: string; role?: string; avatarUrl: string | null };
type ProjectOption = { id: string; name: string; color: string | null };
type TeamMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  teamRole: string;
  allocation: string;
  responsibilities: string | null;
  projectId: string | null;
  projectName: string | null;
};
type Team = {
  id: string;
  name: string;
  description: string | null;
  focus: string | null;
  leadId: string | null;
  lead?: TeamMember | null;
  members: TeamMember[];
  memberCount: number;
};

const roleColors: Record<string, string> = {
  lead: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  manager: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contributor: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  reviewer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function TeamManagementClient({
  initialTeams,
  users,
  projects,
  canManage,
  canDelete,
}: {
  initialTeams: Team[];
  users: UserOption[];
  projects: ProjectOption[];
  canManage: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeams[0]?.id || "");
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || teams[0] || null;

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamFocus, setTeamFocus] = useState("");
  const [teamLeadId, setTeamLeadId] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);

  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("contributor");
  const [memberAllocation, setMemberAllocation] = useState("100");
  const [memberProjectId, setMemberProjectId] = useState("");
  const [memberResponsibilities, setMemberResponsibilities] = useState("");
  const [savingMember, setSavingMember] = useState(false);

  const availableUsers = useMemo(() => {
    if (!selectedTeam) return users;
    const existing = new Set(selectedTeam.members.map((member) => member.userId));
    return users.filter((user) => !existing.has(user.id));
  }, [selectedTeam, users]);

  function getInitials(name: string) {
    return name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2);
  }

  function openCreateTeam() {
    setEditingTeam(null);
    setTeamName("");
    setTeamDescription("");
    setTeamFocus("");
    setTeamLeadId("");
    setShowTeamModal(true);
  }

  function openEditTeam(team: Team) {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamDescription(team.description || "");
    setTeamFocus(team.focus || "");
    setTeamLeadId(team.leadId || "");
    setShowTeamModal(true);
  }

  async function reloadTeams() {
    const res = await fetch("/api/teams");
    if (res.ok) {
      const data = await res.json();
      setTeams(data.teams);
      if (!selectedTeamId && data.teams[0]) setSelectedTeamId(data.teams[0].id);
    }
    router.refresh();
  }

  async function saveTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSavingTeam(true);

    const url = editingTeam ? `/api/teams/${editingTeam.id}` : "/api/teams";
    const method = editingTeam ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: teamName.trim(),
        description: teamDescription.trim() || null,
        focus: teamFocus.trim() || null,
        leadId: teamLeadId || null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (!editingTeam) setSelectedTeamId(data.team.id);
      setShowTeamModal(false);
      await reloadTeams();
    }
    setSavingTeam(false);
  }

  async function deleteTeam(teamId: string) {
    if (!confirm("Delete this team and its membership assignments?")) return;
    const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
    if (res.ok) {
      setTeams((prev) => prev.filter((team) => team.id !== teamId));
      setSelectedTeamId(teams.find((team) => team.id !== teamId)?.id || "");
      router.refresh();
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeam || !memberUserId) return;
    setSavingMember(true);

    const res = await fetch(`/api/teams/${selectedTeam.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: memberUserId,
        teamRole: memberRole,
        allocation: memberAllocation,
        projectId: memberProjectId || null,
        responsibilities: memberResponsibilities.trim() || null,
      }),
    });

    if (res.ok) {
      setMemberUserId("");
      setMemberRole("contributor");
      setMemberAllocation("100");
      setMemberProjectId("");
      setMemberResponsibilities("");
      await reloadTeams();
    }
    setSavingMember(false);
  }

  async function removeMember(memberId: string) {
    if (!selectedTeam) return;
    const res = await fetch(`/api/teams/${selectedTeam.id}/members?memberId=${memberId}`, {
      method: "DELETE",
    });
    if (res.ok) await reloadTeams();
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
      <aside className="bg-slate-900 border border-white/5 rounded-xl p-4 h-fit">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">Team directory</h2>
            <p className="text-xs text-slate-500">{teams.length} teams</p>
          </div>
          {canManage && (
            <button onClick={openCreateTeam} className="rounded-lg bg-brand-500 p-2 text-white hover:bg-brand-600 transition">
              <Plus size={16} />
            </button>
          )}
        </div>

        <div className="space-y-2">
          {teams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <Users className="mx-auto mb-3 text-slate-600" size={28} />
              <p className="text-sm text-slate-500">No teams yet.</p>
            </div>
          ) : teams.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeamId(team.id)}
              className={clsx(
                "w-full rounded-xl border p-3 text-left transition",
                selectedTeam?.id === team.id ? "border-brand-500/40 bg-brand-500/10" : "border-white/5 bg-slate-950/40 hover:border-white/10"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white truncate">{team.name}</h3>
                <span className="text-xs rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">{team.memberCount}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{team.focus || team.description || "No focus set"}</p>
            </button>
          ))}
        </div>
      </aside>

      <main className="space-y-6">
        {!selectedTeam ? (
          <div className="bg-slate-900 border border-white/5 rounded-xl p-12 text-center">
            <Users className="mx-auto mb-3 text-slate-600" size={36} />
            <h3 className="font-semibold text-white">Select or create a team</h3>
            <p className="text-sm text-slate-500 mt-1">Manage team structure, allocation, and project responsibilities.</p>
          </div>
        ) : (
          <>
            <section className="bg-slate-900 border border-white/5 rounded-xl p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">{selectedTeam.name}</h1>
                  <p className="mt-1 text-sm text-slate-400">{selectedTeam.description || "No description"}</p>
                  {selectedTeam.focus && (
                    <p className="mt-2 rounded-lg bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                      <span className="text-slate-500">Focus:</span> {selectedTeam.focus}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button onClick={() => openEditTeam(selectedTeam)} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 transition">
                      <Save size={14} /> Edit
                    </button>
                    {canDelete && (
                      <button onClick={() => deleteTeam(selectedTeam.id)} className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/15 transition">
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-950/50 p-4">
                  <p className="text-2xl font-bold text-white">{selectedTeam.memberCount}</p>
                  <p className="text-xs text-slate-500">Members</p>
                </div>
                <div className="rounded-xl bg-slate-950/50 p-4">
                  <p className="text-2xl font-bold text-white">{selectedTeam.lead?.name || "—"}</p>
                  <p className="text-xs text-slate-500">Team lead</p>
                </div>
                <div className="rounded-xl bg-slate-950/50 p-4">
                  <p className="text-2xl font-bold text-white">
                    {selectedTeam.members.length > 0
                      ? Math.round(selectedTeam.members.reduce((sum, member) => sum + Number(member.allocation || 0), 0) / selectedTeam.members.length)
                      : 0}%
                  </p>
                  <p className="text-xs text-slate-500">Avg allocation</p>
                </div>
              </div>
            </section>

            {canManage && (
              <section className="bg-slate-900 border border-white/5 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus size={18} className="text-brand-400" />
                  <h2 className="font-semibold text-white">Add member</h2>
                </div>
                <form onSubmit={addMember} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <select value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select user</option>
                    {availableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                  <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="lead">Lead</option>
                    <option value="manager">Manager</option>
                    <option value="contributor">Contributor</option>
                    <option value="reviewer">Reviewer</option>
                  </select>
                  <select value={memberProjectId} onChange={(e) => setMemberProjectId(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">No project</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                  <input value={memberAllocation} onChange={(e) => setMemberAllocation(e.target.value)} placeholder="Allocation %" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  <button disabled={savingMember || !memberUserId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition">
                    {savingMember ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add
                  </button>
                  <input value={memberResponsibilities} onChange={(e) => setMemberResponsibilities(e.target.value)} placeholder="Responsibilities / ownership" className="md:col-span-5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </form>
              </section>
            )}

            <section className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
              <div className="border-b border-white/5 px-5 py-4">
                <h2 className="font-semibold text-white">Members & responsibilities</h2>
              </div>
              {selectedTeam.members.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">No members assigned.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {selectedTeam.members.map((member) => (
                    <div key={member.membershipId} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0">
                          {getInitials(member.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{member.name}</p>
                          <p className="text-xs text-slate-500 truncate">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <span className={clsx("text-[10px] uppercase tracking-wider rounded border px-2 py-1", roleColors[member.teamRole] || roleColors.contributor)}>{member.teamRole}</span>
                        <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400">{member.allocation}%</span>
                        {member.projectName && <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400">{member.projectName}</span>}
                        {member.responsibilities && <span className="max-w-xs truncate rounded bg-slate-800 px-2 py-1 text-xs text-slate-400">{member.responsibilities}</span>}
                        {canManage && (
                          <button
                            onClick={() => removeMember(member.membershipId)}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition"
                            aria-label="Remove member"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTeamModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-slide-in">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingTeam ? "Edit team" : "Create team"}</h2>
              <button onClick={() => setShowTeamModal(false)} className="p-1 text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={saveTeam} className="space-y-4">
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required placeholder="Team name" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <textarea value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} rows={2} placeholder="Description" className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <input value={teamFocus} onChange={(e) => setTeamFocus(e.target.value)} placeholder="Current focus / mission" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <select value={teamLeadId} onChange={(e) => setTeamLeadId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">No lead</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
              <button disabled={savingTeam} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition">
                {savingTeam ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingTeam ? "Save team" : "Create team"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
