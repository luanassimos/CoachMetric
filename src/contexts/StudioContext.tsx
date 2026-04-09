import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStudios } from "@/hooks/useStudios";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStudios } from "@/hooks/useUserStudios";
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
  canSelectAllStudios: boolean;
  isReady: boolean;
  setSelectedStudioId: (studioId: string | "all") => void;
};

const StudioContext = createContext<StudioContextValue | undefined>(undefined);

export function StudioProvider({ children }: { children: ReactNode }) {
  const { studios, loading, canSelectAllStudios } = useStudios();
  const { user } = useAuth();
  const { memberships } = useUserStudios();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedStudioId, setSelectedStudioIdState] = useState<StudioSelection>(
    () => {
      const urlStudio =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("studio")
          : null;

      const stored = getSelectedStudioSession();

      if (urlStudio === "all") return "all";
      if (urlStudio) return urlStudio;

      if (stored === "all") return "all";
      if (stored) return stored;

      return null;
    },
  );

  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(location.search);
    const studioFromUrl = params.get("studio");
    const allowedStudioIds = memberships.map((m) => m.studio_id);
    const canUseAllStudios = canSelectAllStudios;

    if (!canUseAllStudios && !allowedStudioIds.length) return;

    if (!studioFromUrl) {
      const fallbackStudioId = canUseAllStudios ? "all" : allowedStudioIds[0];

      if (!fallbackStudioId) return;

      if (selectedStudioId !== fallbackStudioId) {
        setSelectedStudioIdState(fallbackStudioId);
        setSelectedStudioSession(fallbackStudioId);
      }

      params.set("studio", fallbackStudioId);

      navigate(
        {
          pathname: location.pathname,
          search: `?${params.toString()}`,
        },
        { replace: true },
      );

      return;
    }

    if (studioFromUrl === "all") {
      if (!canUseAllStudios) {
        const fallbackStudioId = allowedStudioIds[0];
        if (!fallbackStudioId) return;

        if (selectedStudioId !== fallbackStudioId) {
          setSelectedStudioIdState(fallbackStudioId);
          setSelectedStudioSession(fallbackStudioId);
        }

        params.set("studio", fallbackStudioId);

        navigate(
          {
            pathname: location.pathname,
            search: `?${params.toString()}`,
          },
          { replace: true },
        );

        return;
      }

      if (selectedStudioId !== "all") {
        setSelectedStudioIdState("all");
        setSelectedStudioSession("all");
      }

      return;
    }

    if (!canUseAllStudios && !allowedStudioIds.includes(studioFromUrl)) {
      const fallbackStudioId = allowedStudioIds[0];
      if (!fallbackStudioId) return;

      if (selectedStudioId !== fallbackStudioId) {
        setSelectedStudioIdState(fallbackStudioId);
        setSelectedStudioSession(fallbackStudioId);
      }

      params.set("studio", fallbackStudioId);

      navigate(
        {
          pathname: location.pathname,
          search: `?${params.toString()}`,
        },
        { replace: true },
      );

      return;
    }

    if (studioFromUrl !== selectedStudioId) {
      setSelectedStudioIdState(studioFromUrl);
      setSelectedStudioSession(studioFromUrl);
    }
  }, [
    user,
    memberships,
    canSelectAllStudios,
    location.pathname,
    location.search,
    navigate,
    selectedStudioId,
  ]);

  useEffect(() => {
    if (!user) return;

    if (canSelectAllStudios) {
      if (selectedStudioId === "all") {
        setSelectedStudioSession("all");
      }
      return;
    }

    if (!studios.length) return;

    const allowedStudioIds = memberships.map((m) => m.studio_id);

    if (!allowedStudioIds.length) return;

    const hasPersistedStudio = selectedStudioId
      ? allowedStudioIds.includes(selectedStudioId)
      : false;

    if (hasPersistedStudio) return;

    const fallbackStudioId = allowedStudioIds[0];

    setSelectedStudioIdState(fallbackStudioId);
    setSelectedStudioSession(fallbackStudioId);
  }, [studios, memberships, selectedStudioId, canSelectAllStudios, user]);

  const selectedStudio = useMemo(() => {
    if (!selectedStudioId || selectedStudioId === "all") return null;

    if (canSelectAllStudios) {
      return studios.find((studio) => studio.id === selectedStudioId) ?? null;
    }

    const allowedStudioIds = new Set(memberships.map((m) => m.studio_id));

    if (!allowedStudioIds.has(selectedStudioId)) {
      return null;
    }

    return studios.find((studio) => studio.id === selectedStudioId) ?? null;
  }, [studios, selectedStudioId, memberships, canSelectAllStudios]);

  const isAllStudios = selectedStudioId === "all" && canSelectAllStudios;

  const isReady =
  !loading &&
  !(selectedStudioId === "all" && !canSelectAllStudios);

  const setSelectedStudioId = useCallback(
    (studioId: string | "all") => {
      const canUseAllStudios = canSelectAllStudios;
      const allowedStudioIds = memberships.map((m) => m.studio_id);

      if (studioId === "all" && !canUseAllStudios) {
        const fallbackStudioId = allowedStudioIds[0];
        if (!fallbackStudioId) return;
        studioId = fallbackStudioId;
      }

      if (
        studioId !== "all" &&
        !canUseAllStudios &&
        !allowedStudioIds.includes(studioId)
      ) {
        const fallbackStudioId = allowedStudioIds[0];
        if (!fallbackStudioId) return;
        studioId = fallbackStudioId;
      }

      setSelectedStudioIdState(studioId);
      setSelectedStudioSession(studioId);

      const nextParams = new URLSearchParams(location.search);
      nextParams.set("studio", studioId);

      navigate(
        {
          pathname: location.pathname,
          search: `?${nextParams.toString()}`,
        },
        { replace: false },
      );
    },
    [location.pathname, location.search, navigate, memberships, canSelectAllStudios],
  );

  const value = useMemo(
    () => ({
      studios,
      studiosLoading: loading,
      selectedStudioId,
      selectedStudio,
      isAllStudios,
      canSelectAllStudios,
      isReady,
      setSelectedStudioId,
    }),
    [
      studios,
      loading,
      selectedStudioId,
      selectedStudio,
      isAllStudios,
      canSelectAllStudios,
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
