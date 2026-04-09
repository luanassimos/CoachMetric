import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStudios } from "@/data/supabaseStudios";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStudios } from "@/hooks/useUserStudios";
import { supabase } from "@/lib/supabase";
import {
  canAccessAdminFeatures,
  canAccessAllStudiosScope,
} from "@/lib/devAccess";

export function useStudios() {
  const { user, globalRole, loading: authLoading } = useAuth();
  const { memberships, loading: membershipsLoading } = useUserStudios();
  const totalStudiosQuery = useQuery({
    queryKey: ["studios-total-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("studios")
        .select("id", { count: "exact", head: true });

      if (error) throw error;

      return count ?? 0;
    },
    enabled: !!user && !authLoading,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const canSelectAllStudios = canAccessAllStudiosScope({
    globalRole,
    membershipStudioIds: memberships.map((membership) => membership.studio_id),
    totalStudiosCount: totalStudiosQuery.data ?? 0,
  });

  const query = useQuery({
    queryKey: ["studios", globalRole, memberships, canSelectAllStudios],
    queryFn: async () => {
      if (canAccessAdminFeatures(globalRole) || canSelectAllStudios) {
        return fetchStudios();
      }

      const allowedStudioIds = [...new Set(memberships.map((m) => m.studio_id))];

      if (allowedStudioIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("studios")
        .select("*")
        .in("id", allowedStudioIds)
        .order("name", { ascending: true });

      if (error) throw error;

      return data ?? [];
    },
    enabled:
      !!user &&
      !authLoading &&
      ((!membershipsLoading && !totalStudiosQuery.isLoading) ||
        canAccessAdminFeatures(globalRole)),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const studios = useMemo(() => query.data ?? [], [query.data]);

  return {
    studios,
    loading:
      authLoading ||
      membershipsLoading ||
      totalStudiosQuery.isLoading ||
      query.isLoading,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    canSelectAllStudios,
  };
}
