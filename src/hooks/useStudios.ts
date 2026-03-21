import { useEffect, useState } from "react";
import type { Studio } from "@/lib/types";
import { fetchStudios } from "@/data/supabaseStudios";

export function useStudios() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudios() {
      try {
        setLoading(true);
        const data = await fetchStudios();
        setStudios(data ?? []);
      } catch (err) {
        console.error("Failed to load studios:", err);
        setError("Failed to load studios");
      } finally {
        setLoading(false);
      }
    }

    loadStudios();
  }, []);

  return {
    studios,
    loading,
    error,
  };
}