import { supabase } from "@/lib/supabase";
import type { CoachActivityLog, CoachNoteSeverity, CoachNoteType } from "@/lib/types";

function makeTextId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

type CreateCoachActivityLogInput = {
  coach_id: string;
  studio_id: string;
  date: string;
  type: CoachNoteType;
  severity: CoachNoteSeverity;
  title: string;
  description: string;
  created_by?: string;
};

export async function fetchCoachActivityLogs(
  coachId: string,
  studioId: string,
): Promise<CoachActivityLog[]> {
  const { data, error } = await supabase
    .from("coach_activity_logs")
    .select("*")
    .eq("coach_id", coachId)
    .eq("studio_id", studioId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CoachActivityLog[];
}

export async function createCoachActivityLog(
  input: CreateCoachActivityLogInput,
): Promise<CoachActivityLog> {
  const payload = {
    id: makeTextId("log"),
    coach_id: input.coach_id,
    studio_id: input.studio_id,
    date: input.date,
    type: input.type,
    severity: input.severity,
    title: input.title.trim(),
    description: input.description.trim(),
    created_by: input.created_by?.trim() || "Head Coach",
  };

  console.log("createCoachActivityLog payload:", payload);

  const { data, error } = await supabase
    .from("coach_activity_logs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("createCoachActivityLog error full:", error);
    throw error;
  }

  console.log("createCoachActivityLog success:", data);

  return data as CoachActivityLog;
}
export async function updateCoachActivityLog(
  id: string,
  updates: Partial<{
    date: string;
    type: CoachNoteType;
    severity: CoachNoteSeverity;
    title: string;
    description: string;
    created_by: string;
  }>,
): Promise<CoachActivityLog> {
  const payload = {
    ...(updates.date !== undefined ? { date: updates.date } : {}),
    ...(updates.type !== undefined ? { type: updates.type } : {}),
    ...(updates.severity !== undefined ? { severity: updates.severity } : {}),
    ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
    ...(updates.description !== undefined
      ? { description: updates.description.trim() }
      : {}),
    ...(updates.created_by !== undefined
      ? { created_by: updates.created_by.trim() }
      : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("coach_activity_logs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updateCoachActivityLog error full:", error);
    throw error;
  }

  return data as CoachActivityLog;
}

export async function deleteCoachActivityLog(id: string): Promise<void> {
  const { error } = await supabase
    .from("coach_activity_logs")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteCoachActivityLog error full:", error);
    throw error;
  }
}