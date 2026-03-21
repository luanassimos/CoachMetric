import { useEffect, useState } from "react";
import type { Coach } from "@/lib/types";
import { fetchCoaches } from "@/data/supabaseCoaches";

export function useCoaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCoaches() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchCoaches();
      setCoaches(data ?? []);
    } catch (err) {
      console.error("Failed to load coaches:", err);
      setError("Failed to load coaches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoaches();
  }, []);

  return {
    coaches,
    loading,
    error,
    refetch: loadCoaches, // 🔥 ESSA LINHA RESOLVE TUDO
  };
}