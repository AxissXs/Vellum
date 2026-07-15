"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type NotificationPreference = {
  id: string;
  userId: string;
  eventType: string;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  telegramEnabled: boolean;
};

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async (): Promise<NotificationPreference[]> => {
      const res = await api.get<{ preferences: NotificationPreference[] }>("/api/push/preferences");
      return res.preferences;
    },
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      eventType: string;
      pushEnabled?: boolean;
      inAppEnabled?: boolean;
      emailEnabled?: boolean;
      telegramEnabled?: boolean;
    }) => {
      const res = await api.patch<{ preferences: NotificationPreference[] }>("/api/push/preferences", input);
      return res.preferences;
    },
    onMutate: async (newPref) => {
      await queryClient.cancelQueries({ queryKey: ["notification-preferences"] });
      const previous = queryClient.getQueryData<NotificationPreference[]>([
        "notification-preferences",
      ]);

      if (previous) {
        queryClient.setQueryData(
          ["notification-preferences"],
          previous.map((p) =>
            p.eventType === newPref.eventType
              ? {
                  ...p,
                  pushEnabled:
                    newPref.pushEnabled !== undefined
                      ? newPref.pushEnabled
                      : p.pushEnabled,
                  inAppEnabled:
                    newPref.inAppEnabled !== undefined
                      ? newPref.inAppEnabled
                      : p.inAppEnabled,
                  emailEnabled:
                    newPref.emailEnabled !== undefined
                      ? newPref.emailEnabled
                      : p.emailEnabled,
                  telegramEnabled:
                    newPref.telegramEnabled !== undefined
                      ? newPref.telegramEnabled
                      : p.telegramEnabled,
                }
              : p
          )
        );
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notification-preferences"], context.previous);
      }
      toast.error("Failed to update preference");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}
