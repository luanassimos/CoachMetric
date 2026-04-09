import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type UserStudioMembership = {
  studio_id: string;
  role: "head_coach" | "coach";
};

export function useUserStudios() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["user-studios", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_studio_roles")
        .select("studio_id, role")
        .eq("user_id", user!.id);

      if (error) throw error;

      return (data ?? []) as UserStudioMembership[];
    },
    staleTime: 5 * 60_000,
  });

  return {
    memberships: query.data ?? [],
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}