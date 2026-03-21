import {
  calculateOnboardingProgress,
  getOnboardingStatus,
} from "../utils/onboarding";
import { supabase } from "@/lib/supabase";
import { createOnboardingTemplate } from "@/data/onboardingTemplate";

export async function fetchCoaches() {
  const { data, error } = await supabase
    .from("coaches")
    .select("*")
    .order("first_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchCoachById(id: string) {
  const { data, error } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createCoach(input: {
  studio_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  role_title?: string;
  hire_date?: string;
  status?: string;
}) {
  const payload = {
    id: crypto.randomUUID(),
    studio_id: input.studio_id.trim(),
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: input.email?.trim() || null,
    role_title: input.role_title?.trim() || null,
    hire_date: input.hire_date || new Date().toISOString(),
    status: input.status?.trim() || "active",
    onboarding: createOnboardingTemplate(),
  };

  const { data, error } = await supabase
    .from("coaches")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCoach(
  id: string,
  input: {
    studio_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    role_title?: string;
    hire_date?: string;
    status?: string;
  }
) {
  const payload = {
    studio_id: input.studio_id.trim(),
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: input.email?.trim() || null,
    role_title: input.role_title?.trim() || null,
    hire_date: input.hire_date || new Date().toISOString(),
    status: input.status?.trim() || "active",
  };

  const { data, error } = await supabase
    .from("coaches")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCoach(id: string) {
  const { error } = await supabase
    .from("coaches")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function toggleCoachStatus(id: string, currentStatus: string) {
  const newStatus = currentStatus === "active" ? "inactive" : "active";

  const { data, error } = await supabase
    .from("coaches")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleOnboardingTask(
  coachId: string,
  stageKey: string,
  taskId: string
) {
  const { data: coach, error: fetchError } = await supabase
    .from("coaches")
    .select("id, onboarding")
    .eq("id", coachId)
    .single();

  if (fetchError) throw fetchError;
  if (!coach?.onboarding) throw new Error("Onboarding not found");

  const onboarding = coach.onboarding;

  const updatedStages = onboarding.stages.map((stage: any) => {
    if (stage.key !== stageKey) return stage;

    return {
      ...stage,
      tasks: stage.tasks.map((task: any) => {
        if (task.id !== taskId) return task;

        const nextCompleted = !task.completed;

        return {
          ...task,
          completed: nextCompleted,
          completed_at: nextCompleted ? new Date().toISOString() : null,
        };
      }),
    };
  });

  const updatedOnboarding = {
    ...onboarding,
    stages: updatedStages,
  };

  const progress = calculateOnboardingProgress(updatedOnboarding);
  const status = getOnboardingStatus(progress);

  updatedOnboarding.progress = progress;
  updatedOnboarding.status = status;
  

  const { data, error } = await supabase
    .from("coaches")
    .update({ onboarding: updatedOnboarding })
    .eq("id", coachId)
    .select()
    .single();

  if (error) throw error;
  return data;
}