import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useStudios } from "@/hooks/useStudios";
import {
  getSelectedStudioSession,
  setSelectedStudioSession,
} from "@/data/session";
import type { Studio } from "@/lib/types";

type StudioSelection = string | "all" | null;

type StudioContextValue = {
  studios: Studio[];
  studiosLoading: boolean;
  selectedStudioId: StudioSelection;
  selectedStudio: Studio | null;
  isAllStudios: boolean;
  isReady: boolean;
  setSelectedStudioId: (studioId: string | "all") => void;
};

const StudioContext = createContext<StudioContextValue | undefined>(undefined);

export function StudioProvider({ children }: { children: ReactNode }) {
  const { studios, loading } = useStudios();
  const [selectedStudioId, setSelectedStudioIdState] = useState<StudioSelection>(
    () => {
      const stored = getSelectedStudioSession();
      return stored === "all" ? "all" : stored;
    },
  );

  useEffect(() => {
    if (selectedStudioId === "all") {
      setSelectedStudioSession("all");
      return;
    }

    if (!studios.length) return;

    const hasPersistedStudio = selectedStudioId
      ? studios.some((studio) => studio.id === selectedStudioId)
      : false;

    if (hasPersistedStudio) return;

    const fallbackStudioId = studios[0].id;
    setSelectedStudioIdState(fallbackStudioId);
    setSelectedStudioSession(fallbackStudioId);
  }, [studios, selectedStudioId]);

  const selectedStudio = useMemo(() => {
    if (!selectedStudioId || selectedStudioId === "all") return null;
    return studios.find((studio) => studio.id === selectedStudioId) ?? null;
  }, [studios, selectedStudioId]);

  const isAllStudios = selectedStudioId === "all";
  const isReady = !loading && (selectedStudioId !== null || studios.length > 0);

  const setSelectedStudioId = useCallback((studioId: string | "all") => {
    setSelectedStudioIdState(studioId);
    setSelectedStudioSession(studioId);
  }, []);

  const value = useMemo(
  () => ({
    studios,
    studiosLoading: loading,
    selectedStudioId,
    selectedStudio,
    isAllStudios,
    isReady,
    setSelectedStudioId,
  }),
    [
  studios,
  loading,
  selectedStudioId,
  selectedStudio,
  isAllStudios,
  isReady,
  setSelectedStudioId,
],
  );

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);

  if (!context) {
    throw new Error("useStudio must be used within a StudioProvider");
  }

  return context;
}