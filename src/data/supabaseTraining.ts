import { supabase } from "@/lib/supabase";

function makeTextId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function fetchTrainingSessions(studioId?: string) {
  let query = supabase
    .from("training_sessions")
    .select("*")
    .order("session_date", { ascending: false });

  if (studioId) {
    query = query.eq("studio_id", studioId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function fetchTrainingSessionById(id: string) {
  const { data, error } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createTrainingSession(input: {
  title: string;
  session_date: string;
  topic?: string;
  facilitator_name?: string;
  studio_id: string;
  description?: string;
  goals?: string;
  notes?: string;
  material_url?: string;
  material_name?: string;
}) {
  const payload = {
    id: makeTextId("ts"),
    title: input.title.trim(),
    session_date: input.session_date,
    topic: input.topic?.trim() || null,
    facilitator_name: input.facilitator_name?.trim() || null,
    studio_id: input.studio_id.trim(),
    description: input.description?.trim() || null,
    goals: input.goals?.trim() || null,
    notes: input.notes?.trim() || null,
    material_url: input.material_url?.trim() || null,
    material_name: input.material_name?.trim() || null,
  };

  const { data, error } = await supabase
    .from("training_sessions")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrainingSession(
  id: string,
  input: {
    title: string;
    session_date: string;
    topic?: string;
    facilitator_name?: string;
    studio_id: string;
    description?: string;
    goals?: string;
    notes?: string;
    material_url?: string;
    material_name?: string;
  },
) {
  const payload = {
    title: input.title.trim(),
    session_date: input.session_date,
    topic: input.topic?.trim() || null,
    facilitator_name: input.facilitator_name?.trim() || null,
    studio_id: input.studio_id.trim(),
    description: input.description?.trim() || null,
    goals: input.goals?.trim() || null,
    notes: input.notes?.trim() || null,
    material_url: input.material_url?.trim() || null,
    material_name: input.material_name?.trim() || null,
  };

  const { data, error } = await supabase
    .from("training_sessions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTrainingSession(id: string) {
  const { error } = await supabase
    .from("training_sessions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function fetchTrainingAttendance() {
  const { data, error } = await supabase
    .from("training_attendance")
    .select("*");

  if (error) throw error;
  return data ?? [];
}

export async function fetchTrainingAttendanceByStudio(studioId: string) {
  const { data: sessions, error: sessionsError } = await supabase
    .from("training_sessions")
    .select("id")
    .eq("studio_id", studioId);

  if (sessionsError) throw sessionsError;

  const sessionIds = (sessions ?? []).map((session) => session.id);

  if (sessionIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("training_attendance")
    .select("*")
    .in("training_session_id", sessionIds);

  if (error) throw error;
  return data ?? [];
}

export async function fetchTrainingAttendanceBySessionId(trainingSessionId: string) {
  const { data, error } = await supabase
    .from("training_attendance")
    .select("*")
    .eq("training_session_id", trainingSessionId);

  if (error) throw error;
  return data ?? [];
}

export async function saveTrainingAttendance(input: {
  coach_id: string;
  training_session_id: string;
  attended: boolean;
  notes?: string;
}) {
  const { data: existing, error: existingError } = await supabase
    .from("training_attendance")
    .select("id")
    .eq("coach_id", input.coach_id)
    .eq("training_session_id", input.training_session_id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { data, error } = await supabase
      .from("training_attendance")
      .update({
        attended: input.attended,
        notes: input.notes?.trim() || null,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const payload = {
    id: makeTextId("ta"),
    coach_id: input.coach_id,
    training_session_id: input.training_session_id,
    attended: input.attended,
    notes: input.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("training_attendance")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertTrainingAttendance(input: {
  coach_id: string;
  training_session_id: string;
  attended: boolean;
  notes?: string;
}) {
  return saveTrainingAttendance(input);
}