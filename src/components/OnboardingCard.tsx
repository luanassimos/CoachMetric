import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CoachOnboarding } from "@/lib/types";
import { toggleOnboardingTask } from "@/data/supabaseCoaches";

type Props = {
  onboarding: CoachOnboarding;
  coachId: string;
};

function calculateLocalProgress(onboarding: CoachOnboarding) {
  const allTasks = onboarding.stages.flatMap((stage) => stage.tasks);
  const completedTasks = allTasks.filter((task) => task.completed).length;

  if (allTasks.length === 0) return 0;

  return Math.round((completedTasks / allTasks.length) * 100);
}

function getLocalStatus(
  progress: number,
): "not_started" | "in_progress" | "completed" {
  if (progress === 0) return "not_started";
  if (progress === 100) return "completed";
  return "in_progress";
}

function getStatusLabel(status: CoachOnboarding["status"]) {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    default:
      return "Unknown";
  }
}

function getStatusBadgeClasses(status: CoachOnboarding["status"]) {
  switch (status) {
    case "completed":
      return "border-green-500/15 bg-green-500/10 text-green-300";
    case "in_progress":
      return "border-amber-500/15 bg-amber-500/10 text-amber-300";
    case "not_started":
    default:
      return "border-white/10 bg-white/[0.04] text-muted-foreground";
  }
}

export default function OnboardingCard({ onboarding, coachId }: Props) {
  const [localOnboarding, setLocalOnboarding] = useState<CoachOnboarding>(onboarding);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [openStages, setOpenStages] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(onboarding.stages.map((stage) => [stage.key, true])),
  );

  const totalTasks = useMemo(
    () => localOnboarding.stages.flatMap((stage) => stage.tasks).length,
    [localOnboarding],
  );

  const completedTasks = useMemo(
    () =>
      localOnboarding.stages
        .flatMap((stage) => stage.tasks)
        .filter((task) => task.completed).length,
    [localOnboarding],
  );

  const handleToggleStage = (stageKey: string) => {
    setOpenStages((prev) => ({
      ...prev,
      [stageKey]: !prev[stageKey],
    }));
  };

  const handleToggle = async (stageKey: string, taskId: string) => {
    const previousOnboarding = localOnboarding;

    const updatedStages = localOnboarding.stages.map((stage) => {
      if (stage.key !== stageKey) return stage;

      return {
        ...stage,
        tasks: stage.tasks.map((task) => {
          if (task.id !== taskId) return task;

          return {
            ...task,
            completed: !task.completed,
          };
        }),
      };
    });

    const updatedProgress = calculateLocalProgress({
      ...localOnboarding,
      stages: updatedStages,
    });

    const updatedStatus = getLocalStatus(updatedProgress);

    const optimisticOnboarding: CoachOnboarding = {
      ...localOnboarding,
      stages: updatedStages,
      progress: updatedProgress,
      status: updatedStatus,
    };

    setLocalOnboarding(optimisticOnboarding);

    try {
      setIsSaving(true);

      const saved = await toggleOnboardingTask(coachId, stageKey, taskId);

      if (saved?.onboarding) {
        setLocalOnboarding(saved.onboarding);
      }
    } catch (error) {
      console.error("Failed to update onboarding task:", error);
      setLocalOnboarding(previousOnboarding);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-semibold tracking-tight">
                Onboarding Progress
              </h3>

              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusBadgeClasses(
                  localOnboarding.status,
                )}`}
              >
                {getStatusLabel(localOnboarding.status)}
              </span>

              {isSaving && (
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <p className="text-muted-foreground">
                {completedTasks} of {totalTasks} tasks completed
              </p>
              <p className="font-data font-medium">{localOnboarding.progress}%</p>
            </div>

            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${localOnboarding.progress}%` }}
              />
            </div>
          </div>

          <ChevronDown
            className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-white/8 p-4">
          {localOnboarding.stages.map((stage) => {
            const stageCompleted = stage.tasks.filter((task) => task.completed).length;
            const stageTotal = stage.tasks.length;
            const stageProgress =
              stageTotal > 0 ? Math.round((stageCompleted / stageTotal) * 100) : 0;
            const stageOpen = openStages[stage.key] ?? true;

            return (
              <div
                key={stage.key}
                className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]"
              >
                <button
                  type="button"
                  onClick={() => handleToggleStage(stage.key)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{stage.title}</p>
                      <p className="whitespace-nowrap text-xs text-muted-foreground">
                        {stageCompleted}/{stageTotal}
                      </p>
                    </div>

                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${stageProgress}%` }}
                      />
                    </div>
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      stageOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {stageOpen && (
                  <div className="space-y-2 border-t border-white/8 px-4 py-3">
                    {stage.tasks.map((task) => (
                      <label
                        key={task.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                          task.completed
                            ? "border-white/8 bg-white/[0.04]"
                            : "border-white/8 bg-white/[0.02] hover:bg-white/[0.03]"
                        } ${isSaving ? "opacity-70" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggle(stage.key, task.id)}
                          disabled={isSaving}
                          className="h-4 w-4 shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <span
                            className={
                              task.completed
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            }
                          >
                            {task.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}