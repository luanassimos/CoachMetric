import { supabase } from "@/lib/supabase";
import type { Evaluation } from "@/lib/types";

function makeTextId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

type CreateEvaluationInput = {
  coach_id: string;
  evaluator_name: string;
  class_date: string;
  class_time: string;
  class_name: string;
  class_type: string;
  class_size: number;
  pre_class_score: number;
  first_timer_intro_score: number;
  intro_score: number;
  class_score: number;
  post_workout_score: number;
  final_score: number;
  normalized_score_percent: number;
  notes_general?: string;

  studio_id?: string;

  template_id?: string | null;
  template_version?: number | null;
  responses_json?: unknown;
  template_snapshot?: unknown;
};

export async function fetchEvaluations(
  studioId?: string
): Promise<Evaluation[]> {
  let query = supabase
    .from("evaluations")
    .select("*")
    .order("created_at", { ascending: false });

  if (studioId) {
    query = query.eq("studio_id", studioId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as Evaluation[];
}

export async function fetchEvaluationById(
  id: string,
  studioId?: string
): Promise<Evaluation> {
  let query = supabase.from("evaluations").select("*").eq("id", id);

  if (studioId) {
    query = query.eq("studio_id", studioId);
  }

  const { data, error } = await query.single();

  if (error) throw error;
  return data as Evaluation;
}

export async function createEvaluation(
  input: CreateEvaluationInput
): Promise<Evaluation> {
  let resolvedStudioId = input.studio_id;

  if (!resolvedStudioId) {
    const { data: coach, error: coachError } = await supabase
      .from("coaches")
      .select("studio_id")
      .eq("id", input.coach_id)
      .single();

    if (coachError) throw coachError;
    resolvedStudioId = coach?.studio_id;
  }

  if (!resolvedStudioId) {
    throw new Error("Could not resolve studio_id for evaluation.");
  }

  const payload = {
    id: makeTextId("eval"),
    studio_id: resolvedStudioId,
    coach_id: input.coach_id,
    evaluator_name: input.evaluator_name.trim(),
    class_date: input.class_date,
    class_time: input.class_time,
    class_name: input.class_name || "",
    class_type: input.class_type,
    class_size: input.class_size,
    pre_class_score: input.pre_class_score,
    first_timer_intro_score: input.first_timer_intro_score,
    intro_score: input.intro_score,
    class_score: input.class_score,
    post_workout_score: input.post_workout_score,
    final_score: input.final_score,
    normalized_score_percent: input.normalized_score_percent,
    notes_general: input.notes_general?.trim() || "",
    template_id: input.template_id ?? null,
    template_version: input.template_version ?? null,
    responses_json: input.responses_json ?? null,
    template_snapshot: input.template_snapshot ?? null,
  };

  const { data, error } = await supabase
    .from("evaluations")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("createEvaluation error:", error);
    throw new Error(error.message || "Failed to create evaluation");
  }

  return data as Evaluation;
}