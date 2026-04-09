import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useStudio } from "@/contexts/StudioContext";
import {
  fetchTrainingSessions as fetchTrainingSessionsByStudio,
  createTrainingSession as createTrainingSessionData,
  updateTrainingSession as updateTrainingSessionData,
} from "@/data/supabaseTraining";

export type TrainingSession = {
  id: string;
  studio_id: string;
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

const trainingSessionsKey = (studioId: string | "all" | null) =>
  ["training_sessions", studioId] as const;

export const useTrainingSessions = () => {
  const { selectedStudioId, isAllStudios, isReady } = useStudio();

  return useQuery({
    queryKey: trainingSessionsKey(selectedStudioId),
    queryFn: () =>
      fetchTrainingSessionsByStudio(
        selectedStudioId === "all" ? undefined : selectedStudioId
      ),
    enabled: isReady && (!!selectedStudioId || isAllStudios),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};

export const useCreateTrainingSession = () => {
  const queryClient = useQueryClient();
  const { selectedStudioId, isAllStudios } = useStudio();

  return useMutation({
    mutationFn: async (
      newSession: Omit<TrainingSession, "id" | "created_at" | "studio_id"> & {
        studio_id?: string;
      },
    ) => {
      const studioId = newSession.studio_id || selectedStudioId;

      if (!studioId || studioId === "all" || isAllStudios) {
        throw new Error("Select a specific studio before creating a training session.");
      }

      return createTrainingSessionData({
        title: newSession.title,
        session_date: newSession.session_date,
        topic: newSession.topic || undefined,
        facilitator_name: newSession.facilitator_name || undefined,
        studio_id: studioId,
        description: newSession.description || undefined,
        goals: newSession.goals || undefined,
        notes: newSession.notes || undefined,
        material_url: newSession.material_url || undefined,
        material_name: newSession.material_name || undefined,
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trainingSessionsKey(selectedStudioId),
      });
      queryClient.invalidateQueries({
        queryKey: ["training_sessions", "all"],
      });
    },
  });
};

export const useUpdateTrainingSession = () => {
  const queryClient = useQueryClient();
  const { selectedStudioId } = useStudio();

  return useMutation({
    mutationFn: async (
      updatedSession: Partial<TrainingSession> & { id: string },
    ) => {
      const studioId = updatedSession.studio_id || selectedStudioId;

      if (!studioId || studioId === "all") {
        throw new Error("A specific studio is required to update this training session.");
      }

      return updateTrainingSessionData(updatedSession.id, {
        title: updatedSession.title || "",
        session_date: updatedSession.session_date || "",
        topic: updatedSession.topic || undefined,
        facilitator_name: updatedSession.facilitator_name || undefined,
        studio_id: studioId,
        description: updatedSession.description || undefined,
        goals: updatedSession.goals || undefined,
        notes: updatedSession.notes || undefined,
        material_url: updatedSession.material_url || undefined,
        material_name: updatedSession.material_name || undefined,
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trainingSessionsKey(selectedStudioId),
      });
      queryClient.invalidateQueries({
        queryKey: ["training_sessions", "all"],
      });
    },
  });
};