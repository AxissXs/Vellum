import {
  useInfiniteQuery,
  useQuery,
  type QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ActivityItem = {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  tag: string | null;
  severity: string;
  createdAt: string;
  userName: string | null;
  userAvatar: string | null;
};

export type ActivitySummary = {
  today: number;
  last7d: number;
  activeUsers7d: number;
  byEntityType: { entityType: string; count: number }[];
  byDay: { date: string; count: number }[];
  topActors: { userId: string; userName: string | null; count: number }[];
};

export type ActivityFilters = {
  entityType?: string;
  userId?: string;
  from?: string;
  to?: string;
  q?: string;
};

export type ActivityResponse = {
  activities: ActivityItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: ActivitySummary | null;
};

export function getActivityFiltersKey(filters: ActivityFilters): QueryKey {
  return [
    filters.entityType ?? null,
    filters.userId ?? null,
    filters.from ?? null,
    filters.to ?? null,
    filters.q ?? null,
  ];
}

function buildActivitySearch(
  filters: ActivityFilters,
  page: number,
  pageSize: number,
  includeSummary: boolean
): string {
  const search = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    includeSummary: includeSummary ? "1" : "0",
  });
  if (filters.entityType) search.set("entityType", filters.entityType);
  if (filters.userId) search.set("userId", filters.userId);
  if (filters.from) search.set("from", filters.from);
  if (filters.to) search.set("to", filters.to);
  if (filters.q) search.set("q", filters.q);
  return search.toString();
}

async function fetchActivity(
  filters: ActivityFilters,
  page: number,
  pageSize: number,
  includeSummary: boolean
) {
  return api.get<ActivityResponse>(
    `/api/activity?${buildActivitySearch(filters, page, pageSize, includeSummary)}`
  );
}

/** Summary + first-page pulse (entity/user/q filters only affect summary via API). */
export function useActivitySummary(filters: ActivityFilters) {
  return useQuery({
    queryKey: ["activity", "summary", ...getActivityFiltersKey(filters)],
    queryFn: async () => {
      const res = await fetchActivity(
        {
          entityType: filters.entityType,
          userId: filters.userId,
          q: filters.q,
        },
        1,
        1,
        true
      );
      return res.summary;
    },
    staleTime: 30_000,
  });
}

export function useActivityFeed(filters: ActivityFilters, pageSize = 25) {
  return useInfiniteQuery({
    queryKey: ["activity", "feed", ...getActivityFiltersKey(filters), pageSize],
    queryFn: ({ pageParam }) =>
      fetchActivity(filters, pageParam, pageSize, false),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
    staleTime: 15_000,
  });
}
