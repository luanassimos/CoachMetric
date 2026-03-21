import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

// ======================
// TYPES (ajusta conforme seu schema)
// ======================
export type TrainingAttendance = {
  id: string;
  session_id: string;
  name: string;
  status: "present" | "absent";
  created_at?: string;
};

// ======================
// QUERY KEY FACTORY
// ======================
const attendanceKeys = {
  all: ["training_attendance"] as const,
  bySession: (sessionId: string) =>
    ["training_attendance", sessionId] as const,
};

// ======================
// FETCH BY SESSION
// ======================
const fetchAttendanceBySession = async (
  sessionId: string
): Promise<TrainingAttendance[]> => {
  const { data, error } = await supabase
    .from("training_attendance")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
};

export const useTrainingAttendance = (sessionId: string) => {
  return useQuery({
    queryKey: attendanceKeys.bySession(sessionId),
    queryFn: () => fetchAttendanceBySession(sessionId),
    enabled: !!sessionId,
  });
};

// ======================
// CREATE ATTENDANCE
// ======================
export const useCreateAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      newItem: Omit<TrainingAttendance, "id" | "created_at">
    ) => {
      const { data, error } = await supabase
        .from("training_attendance")
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.bySession(variables.session_id),
      });
    },
  });
};

// ======================
// UPDATE ATTENDANCE
// ======================
export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updatedItem: Partial<TrainingAttendance> & { id: string }
    ) => {
      const { data, error } = await supabase
        .from("training_attendance")
        .update(updatedItem)
        .eq("id", updatedItem.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    onSuccess: (data) => {
      if (data?.session_id) {
        queryClient.invalidateQueries({
          queryKey: attendanceKeys.bySession(data.session_id),
        });
      }
    },
  });
};

// ======================
// DELETE ATTENDANCE
// ======================
export const useDeleteAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      session_id,
    }: {
      id: string;
      session_id: string;
    }) => {
      const { error } = await supabase
        .from("training_attendance")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return { session_id };
    },

    onSuccess: ({ session_id }) => {
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.bySession(session_id),
      });
    },
  });
};