import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { supabase } from "@/lib/supabase";
import { useStudio } from "@/contexts/StudioContext";
import type { EvaluationResponseInput } from "@/utils/evaluationV2";

export type StoredEvaluationResponse = {
  id: string;
  evaluation_id: string;
  template_item_id: string;
  response_check: boolean | null;
  response_score: number | null;
  response_text: string | null;
};

export function useEvaluationResponses(
  evaluationId: string | undefined,
) {
  const { selectedStudioId } = useStudio();
  const queryClient = useQueryClient();

  const responsesQuery = useQuery({
    enabled: Boolean(evaluationId && selectedStudioId && selectedStudioId !== "all"),
    queryKey: ["evaluation-v2-responses", evaluationId, selectedStudioId],
    queryFn: async (): Promise<StoredEvaluationResponse[]> => {
      if (!evaluationId || !selectedStudioId || selectedStudioId === "all") {
        throw new Error("Invalid context");
      }

      const { data, error } = await supabase
        .from("evaluation_responses")
        .select(
          "id, evaluation_id, template_item_id, response_check, response_score, response_text",
        )
        .eq("evaluation_id", evaluationId);

      if (error) {
        console.error("LOAD evaluation_responses ERROR", error);
        throw error;
      }

      return (data ?? []) as StoredEvaluationResponse[];
    },
  });

  const saveResponseMutation = useMutation({
    mutationFn: async (input: EvaluationResponseInput) => {
      if (!evaluationId || !selectedStudioId || selectedStudioId === "all") {
        throw new Error("Invalid context");
      }

      const existing = (responsesQuery.data ?? []).find(
        (item) => item.template_item_id === input.template_item_id,
      );

      if (existing) {
        const { data, error } = await supabase
          .from("evaluation_responses")
          .update({
            response_check: input.response_check ?? null,
            response_score: input.response_score ?? null,
            response_text: input.response_text ?? null,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          console.error("UPDATE evaluation_responses ERROR", error);
          throw error;
        }

        return data as StoredEvaluationResponse;
      }

      const payload = {
        id: nanoid(),
        evaluation_id: evaluationId,
        template_item_id: input.template_item_id,
        response_check: input.response_check ?? null,
        response_score: input.response_score ?? null,
        response_text: input.response_text ?? null,
      };

      const { data, error } = await supabase
        .from("evaluation_responses")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("INSERT evaluation_responses ERROR", error);
        throw error;
      }

      return data as StoredEvaluationResponse;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["evaluation-v2-responses", evaluationId, selectedStudioId],
        (old: StoredEvaluationResponse[] | undefined) => {
          if (!old) return [data];

          const exists = old.find((r) => r.id === data.id);

          if (exists) {
            return old.map((r) => (r.id === data.id ? data : r));
          }

          return [...old, data];
        },
      );
    },
  });

  const responsesByItemId = useMemo(() => {
    return Object.fromEntries(
      (responsesQuery.data ?? []).map((item) => [item.template_item_id, item]),
    ) as Record<string, StoredEvaluationResponse | undefined>;
  }, [responsesQuery.data]);

  return {
    ...responsesQuery,
    responsesByItemId,
    saveResponse: saveResponseMutation.mutateAsync,
    isSaving: saveResponseMutation.isPending,
  };
}