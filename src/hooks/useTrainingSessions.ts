import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type TrainingSession = {
  id: string;
  studio_id: string | null;
  title: string;
  topic: string | null;
  session_date: string;
  facilitator_name: string | null;
  description?: string | null;
  goals?: string | null;
  notes?: string | null;
  material_url?: string | null;
  material_name?: string | null;
  created_at?: string;
};

const QUERY_KEY = ["training_sessions"];

const fetchTrainingSessions = async (): Promise<TrainingSession[]> => {
  const { data, error } = await supabase
    .from("training_sessions")
    .select("*")
    .order("session_date", { ascending: false });

  if (error) throw error;

  return data ?? [];
};

export const useTrainingSessions = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchTrainingSessions,
  });
};

export const useCreateTrainingSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      newSession: Omit<TrainingSession, "id" | "created_at">
    ) => {
      const payload = {
        ...newSession,
        studio_id: newSession.studio_id?.trim() || null,
        topic: newSession.topic?.trim() || null,
        facilitator_name: newSession.facilitator_name?.trim() || null,
        description: newSession.description?.trim() || null,
        goals: newSession.goals?.trim() || null,
        notes: newSession.notes?.trim() || null,
        material_url: newSession.material_url?.trim() || null,
        material_name: newSession.material_name?.trim() || null,
      };

      const { data, error } = await supabase
        .from("training_sessions")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

export const useDeleteTrainingSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("training_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

export const useUpdateTrainingSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedSession: Partial<TrainingSession> & { id: string }) => {
      const payload = {
        ...updatedSession,
        studio_id: updatedSession.studio_id?.trim() || null,
        topic: updatedSession.topic?.trim() || null,
        facilitator_name: updatedSession.facilitator_name?.trim() || null,
        description: updatedSession.description?.trim() || null,
        goals: updatedSession.goals?.trim() || null,
        notes: updatedSession.notes?.trim() || null,
        material_url: updatedSession.material_url?.trim() || null,
        material_name: updatedSession.material_name?.trim() || null,
      };

      const { data, error } = await supabase
        .from("training_sessions")
        .update(payload)
        .eq("id", updatedSession.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};