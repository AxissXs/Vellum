"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DEFAULT_APP_TIMEZONE } from "@/lib/timezone";

const TimezoneContext = createContext<string>(DEFAULT_APP_TIMEZONE);

export function TimezoneProvider({
  children,
  initialTimezone,
}: {
  children: ReactNode;
  initialTimezone?: string;
}) {
  const { data } = useQuery({
    queryKey: ["app-timezone"],
    queryFn: async () => {
      const res = await api.get<{ timezone: string }>("/api/timezone");
      return res.timezone;
    },
    initialData: initialTimezone ?? DEFAULT_APP_TIMEZONE,
    staleTime: 60_000,
  });

  return (
    <TimezoneContext.Provider value={data || DEFAULT_APP_TIMEZONE}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useAppTimezone(): string {
  return useContext(TimezoneContext);
}
