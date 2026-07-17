import {
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Team = {
  id: string;
  name: string;
  description: string | null;
  leadId: string | null;
  focus: string | null;
  createdAt: string;
  updatedAt: string;
};

type TeamCreateInput = {
  name: string;
  description?: string | null;
  leadId?: string | null;
  focus?: string | null;
};

type TeamUpdateInput = Partial<TeamCreateInput> & { id: string };

type TeamMember = {
  id: string;
  teamId: string;
  userId: string;
  projectId: string | null;
  teamRole: string;
  allocation: string;
  responsibilities: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
};

type TeamMemberCreateInput = {
  teamId: string;
  userId: string;
  projectId?: string | null;
  teamRole?: string;
  allocation?: string;
  responsibilities?: string | null;
};

type TeamMemberUpdateInput = Partial<Omit<TeamMemberCreateInput, "teamId">> & { id: string; teamId: string };

function getTeamQueryKey() {
  return ["teams"] as QueryKey;
}

function getTeamMemberQueryKey(teamId: string) {
  return ["team-members", teamId] as QueryKey;
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TeamCreateInput) => {
      const toastId = toast.loading("Creating team...");
      try {
        const res = await api.post<{ team: Team }>("/api/teams", input);
        toast.success("Team created", { id: toastId });
        return res.team;
      } catch (err) {
        toast.error("Failed to create team", { id: toastId });
        throw err;
      }
    },
    onMutate: async (newTeam) => {
      await queryClient.cancelQueries({ queryKey: getTeamQueryKey() });

      const previousTeams = queryClient.getQueryData<Team[]>(getTeamQueryKey());

      const optimisticTeam: Team = {
        id: `temp-${Date.now()}`,
        name: newTeam.name,
        description: newTeam.description || null,
        leadId: newTeam.leadId || null,
        focus: newTeam.focus || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Team[]>(getTeamQueryKey(), (old) =>
        old ? [...old, optimisticTeam] : [optimisticTeam]
      );

      return { previousTeams };
    },
    onError: (err, newTeam, context) => {
      if (context?.previousTeams) {
        queryClient.setQueryData(getTeamQueryKey(), context.previousTeams);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Team[]>(getTeamQueryKey(), (old) =>
        old?.map((t) => (t.id.startsWith("temp-") ? data : t)) || []
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getTeamQueryKey() });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TeamUpdateInput) => {
      const toastId = toast.loading("Saving changes...");
      try {
        const { id, ...data } = input;
        const res = await api.patch<{ team: Team }>(`/api/teams/${id}`, data);
        toast.success("Team updated", { id: toastId });
        return res.team;
      } catch (err) {
        toast.error("Failed to update team", { id: toastId });
        throw err;
      }
    },
    onMutate: async (updatedTeam) => {
      await queryClient.cancelQueries({ queryKey: getTeamQueryKey() });

      const previousTeams = queryClient.getQueryData<Team[]>(getTeamQueryKey());

      queryClient.setQueryData<Team[]>(getTeamQueryKey(), (old) =>
        old?.map((t) => (t.id === updatedTeam.id ? { ...t, ...updatedTeam } : t)) || []
      );

      return { previousTeams };
    },
    onError: (err, updatedTeam, context) => {
      if (context?.previousTeams) {
        queryClient.setQueryData(getTeamQueryKey(), context.previousTeams);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getTeamQueryKey() });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const toastId = toast.loading("Deleting team...");
      try {
        await api.delete(`/api/teams/${teamId}`);
        toast.success("Team deleted", { id: toastId });
        return teamId;
      } catch (err) {
        toast.error("Failed to delete team", { id: toastId });
        throw err;
      }
    },
    onMutate: async (teamId) => {
      const previousTeams = queryClient.getQueryData<Team[]>(getTeamQueryKey());

      queryClient.setQueryData<Team[]>(getTeamQueryKey(), (old) =>
        old?.filter((t) => t.id !== teamId) || []
      );

      return { previousTeams };
    },
    onError: (err, teamId, context) => {
      if (context?.previousTeams) {
        queryClient.setQueryData(getTeamQueryKey(), context.previousTeams);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getTeamQueryKey() });
    },
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TeamMemberCreateInput) => {
      const toastId = toast.loading("Adding member...");
      try {
        const res = await api.post<{ member: TeamMember }>("/api/teams/members", input);
        toast.success("Member added", { id: toastId });
        return res.member;
      } catch (err) {
        toast.error("Failed to add team member", { id: toastId });
        throw err;
      }
    },
    onMutate: async (newMember) => {
      const queryKey = getTeamMemberQueryKey(newMember.teamId);
      await queryClient.cancelQueries({ queryKey });

      const previousMembers = queryClient.getQueryData<TeamMember[]>(queryKey);

      const optimisticMember: TeamMember = {
        id: `temp-${Date.now()}`,
        teamId: newMember.teamId,
        userId: newMember.userId,
        projectId: newMember.projectId || null,
        teamRole: newMember.teamRole || "contributor",
        allocation: newMember.allocation || "100",
        responsibilities: newMember.responsibilities || null,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<TeamMember[]>(queryKey, (old) =>
        old ? [...old, optimisticMember] : [optimisticMember]
      );

      return { previousMembers, teamId: newMember.teamId };
    },
    onError: (err, newMember, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(getTeamMemberQueryKey(context.teamId), context.previousMembers);
      }
    },
    onSuccess: (data, newMember) => {
      queryClient.setQueryData<TeamMember[]>(getTeamMemberQueryKey(newMember.teamId), (old) =>
        old?.map((m) => (m.id.startsWith("temp-") ? data : m)) || []
      );
    },
    onSettled: (data, error, newMember) => {
      queryClient.invalidateQueries({ queryKey: getTeamMemberQueryKey(newMember.teamId) });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TeamMemberUpdateInput) => {
      const toastId = toast.loading("Saving changes...");
      try {
        const { id, ...data } = input;
        const res = await api.patch<{ member: TeamMember }>(`/api/teams/members/${id}`, data);
        toast.success("Member updated", { id: toastId });
        return res.member;
      } catch (err) {
        toast.error("Failed to update team member", { id: toastId });
        throw err;
      }
    },
    onMutate: async (updatedMember) => {
      const queryKey = getTeamMemberQueryKey(updatedMember.teamId);
      await queryClient.cancelQueries({ queryKey });

      const previousMembers = queryClient.getQueryData<TeamMember[]>(queryKey);

      queryClient.setQueryData<TeamMember[]>(queryKey, (old) =>
        old?.map((m) => (m.id === updatedMember.id ? { ...m, ...updatedMember } : m)) || []
      );

      return { previousMembers, teamId: updatedMember.teamId };
    },
    onError: (err, updatedMember, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(getTeamMemberQueryKey(context.teamId), context.previousMembers);
      }
    },
    onSettled: (data, error, updatedMember) => {
      queryClient.invalidateQueries({ queryKey: getTeamMemberQueryKey(updatedMember.teamId) });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const toastId = toast.loading("Removing member...");
      try {
        await api.delete(`/api/teams/members/${memberId}`);
        toast.success("Member removed", { id: toastId });
        return memberId;
      } catch (err) {
        toast.error("Failed to remove team member", { id: toastId });
        throw err;
      }
    },
    onMutate: async (memberId) => {
      const allQueries = queryClient.getQueryCache().findAll({ queryKey: ["team-members"] });

      const previousData = new Map<QueryKey, TeamMember[]>();

      for (const query of allQueries) {
        const data = queryClient.getQueryData<TeamMember[]>(query.queryKey);
        if (data) {
          previousData.set(query.queryKey, data);
          queryClient.setQueryData(query.queryKey, data.filter((m) => m.id !== memberId));
        }
      }

      return { previousData };
    },
    onError: (err, memberId, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}