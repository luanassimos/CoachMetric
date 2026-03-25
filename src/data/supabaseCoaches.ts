import { supabase } from "@/lib/supabase";
import type { Coach } from "@/lib/types";

function makeTextId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

type CreateCoachInput = {
  first_name: string;
  last_name: string;
  email?: string;
  studio_id: string;
  role_title?: string;
  hire_date?: string;
  status?: "active" | "inactive" | string;
};

type UpdateCoachInput = Partial<{
  first_name: string;
  last_name: string;
  email: string;
  studio_id: string;
  role_title: string;
  hire_date: string;
  status: "active" | "inactive" | string;
  onboarding: Coach["onboarding"];
}>;

function normalizeCoachStatus(
  status?: string | null,
): "active" | "inactive" | undefined {
  if (!status) return undefined;
  return status === "inactive" ? "inactive" : "active";
}

function buildUpdatedOnboarding(
  onboarding: Coach["onboarding"] | undefined,
  taskId: string,
) {
  const base = onboarding ?? {
    status: "not_started" as const,
    progress: 0,
    stages: [],
  };

  const nextStages = base.stages.map((stage) => ({
    ...stage,
    tasks: stage.tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task,
    ),
  }));

  const allTasks = nextStages.flatMap((stage) => stage.tasks);
  const completedCount = allTasks.filter((task) => task.completed).length;
  const totalCount = allTasks.length;
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  let status: "not_started" | "in_progress" | "completed" = "not_started";

  if (totalCount > 0 && completedCount === totalCount) {
    status = "completed";
  } else if (completedCount > 0) {
    status = "in_progress";
  }

  return {
    ...base,
    stages: nextStages,
    progress,
    status,
  };
}

export async function fetchCoaches(studioId?: string): Promise<Coach[]> {
  let query = supabase
    .from("coaches")
    .select("*")
    .order("first_name", { ascending: true });

  if (studioId) {
    query = query.eq("studio_id", studioId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as Coach[];
}

// 🔴 FIX: agora OBRIGA studioId
export async function fetchCoachById(
  id: string,
  studioId: string,
): Promise<Coach> {
  const { data, error } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", id)
    .eq("studio_id", studioId)
    .single();

  if (error) throw error;
  return data as Coach;
}

export async function createCoach(input: CreateCoachInput): Promise<Coach> {
  const payload = {
    id: makeTextId("coach"),
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: input.email?.trim() || null,
    studio_id: input.studio_id,
    role_title: input.role_title?.trim() || "Coach",
    hire_date: input.hire_date || new Date().toISOString().slice(0, 10),
    status: normalizeCoachStatus(input.status) || "active",
  };

  const { data, error } = await supabase
    .from("coaches")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as Coach;
}

// 🔴 FIX: adiciona studioId obrigatório
export async function updateCoach(
  id: string,
  studioId: string,
  input: UpdateCoachInput,
): Promise<Coach> {
  const normalizedStatus = normalizeCoachStatus(input.status);

  const payload = {
    ...(input.first_name !== undefined
      ? { first_name: input.first_name.trim() }
      : {}),
    ...(input.last_name !== undefined
      ? { last_name: input.last_name.trim() }
      : {}),
    ...(input.email !== undefined ? { email: input.email.trim() || null } : {}),
    ...(input.studio_id !== undefined ? { studio_id: input.studio_id } : {}),
    ...(input.role_title !== undefined
      ? { role_title: input.role_title.trim() || null }
      : {}),
    ...(input.hire_date !== undefined ? { hire_date: input.hire_date } : {}),
    ...(normalizedStatus !== undefined ? { status: normalizedStatus } : {}),
    ...(input.onboarding !== undefined ? { onboarding: input.onboarding } : {}),
  };

  const { data, error } = await supabase
    .from("coaches")
    .update(payload)
    .eq("id", id)
    .eq("studio_id", studioId)
    .select()
    .single();

  if (error) throw error;
  return data as Coach;
}

// 🔴 FIX: adiciona studioId
export async function deleteCoach(
  id: string,
  studioId: string,
): Promise<void> {
  const { error } = await supabase
    .from("coaches")
    .delete()
    .eq("id", id)
    .eq("studio_id", studioId);

  if (error) throw error;
}

// 🔴 FIX: tudo agora usa studioId
export async function toggleCoachStatus(
  id: string,
  studioId: string,
  nextStatus?: "active" | "inactive" | string,
): Promise<Coach> {
  const normalizedNextStatus = normalizeCoachStatus(nextStatus);

  if (normalizedNextStatus) {
    return updateCoach(id, studioId, { status: normalizedNextStatus });
  }

  const current = await fetchCoachById(id, studioId);
  const status = current.status === "active" ? "inactive" : "active";

  return updateCoach(id, studioId, { status });
}

// 🔴 FIX: onboarding também protegido por studio
export async function toggleOnboardingTask(
  coachId: string,
  studioId: string,
  taskId: string,
): Promise<Coach> {
  const coach = await fetchCoachById(coachId, studioId);
  const nextOnboarding = buildUpdatedOnboarding(coach.onboarding, taskId);

  return updateCoach(coachId, studioId, {
    onboarding: nextOnboarding,
  });
}