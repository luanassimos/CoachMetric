import { supabase } from "@/lib/supabase";

export async function fetchEvaluations() {
  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .order("class_date", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
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
  notes_general: string;

  template_id?: string | null;
  template_version?: number | null;
  responses_json?: Record<string, number | boolean> | null;
  template_snapshot?: unknown | null;
};

export async function createEvaluation(input: CreateEvaluationInput) {
  const payload = {
    ...input,
    id: crypto.randomUUID(),
  };

  const { data, error } = await supabase
    .from("evaluations")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}