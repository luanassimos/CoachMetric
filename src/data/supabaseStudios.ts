import { supabase } from "@/lib/supabase";

export async function fetchStudios() {
  const { data, error } = await supabase
    .from("studios")
    .select("*")
    .order("name");

  if (error) {
    throw error;
  }

  return data;
}