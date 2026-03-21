export let selectedStudioSession: string = "all";

export function setSelectedStudioSession(value: string) {
  selectedStudioSession = value;
}

export function getSelectedStudioSession() {
  return selectedStudioSession;
}