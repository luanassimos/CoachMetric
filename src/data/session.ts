const SELECTED_STUDIO_STORAGE_KEY = "coachmetric.selectedStudioId";

export function getSelectedStudioSession(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(SELECTED_STUDIO_STORAGE_KEY);
}

export function setSelectedStudioSession(studioId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SELECTED_STUDIO_STORAGE_KEY, studioId);
}

export function clearSelectedStudioSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SELECTED_STUDIO_STORAGE_KEY);
}