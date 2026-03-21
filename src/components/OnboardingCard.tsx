import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CoachOnboarding } from "@/lib/types";
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
  progress: number
): "not_started" | "in_progress" | "completed" {
  if (progress === 0) return "not_started";
  if (progress === 100) return "completed";
  return "in_progress";
}

function getStatusLabel(status: CoachOnboarding["status"]) {
  switch (status) {
    case "not_started":
      return "Not started";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    default:
      return "Unknown";
  }
}

function getStatusBadgeClasses(status: CoachOnboarding["status"]) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700 border-green-200";
    case "in_progress":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "not_started":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function OnboardingCard({ onboarding, coachId }: Props) {
  const [localOnboarding, setLocalOnboarding] = useState(onboarding);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [openStages, setOpenStages] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(onboarding.stages.map((stage) => [stage.key, true]))
  );

  const totalTasks = useMemo(
    () => localOnboarding.stages.flatMap((stage) => stage.tasks).length,
    [localOnboarding]
  );

  const completedTasks = useMemo(
    () =>
      localOnboarding.stages.flatMap((stage) => stage.tasks).filter((task) => task.completed)
        .length,
    [localOnboarding]
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

          const nextCompleted = !task.completed;

          return {
            ...task,
            completed: nextCompleted,
            completed_at: nextCompleted ? new Date().toISOString() : null,
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
    <div className="card-elevated overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full text-left p-5 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-semibold">Onboarding</h3>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClasses(
                  localOnboarding.status
                )}`}
              >
                {getStatusLabel(localOnboarding.status)}
              </span>
              {isSaving && (
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <p className="text-muted-foreground">
                {completedTasks} of {totalTasks} tasks completed
              </p>
              <p className="font-medium">{localOnboarding.progress}%</p>
            </div>

            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/80 transition-all duration-300"
                style={{ width: `${localOnboarding.progress}%` }}
              />
            </div>
          </div>

          <ChevronDown
            className={`mt-1 h-4 w-4 shrink-0 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="border-t p-4 space-y-3">
          {localOnboarding.stages.map((stage) => {
            const stageCompleted = stage.tasks.filter((task) => task.completed).length;
            const stageTotal = stage.tasks.length;
            const stageProgress =
              stageTotal > 0 ? Math.round((stageCompleted / stageTotal) * 100) : 0;
            const stageOpen = openStages[stage.key] ?? true;

            return (
              <div key={stage.key} className="rounded-xl border bg-background">
                <button
                  type="button"
                  onClick={() => handleToggleStage(stage.key)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{stage.title}</p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {stageCompleted}/{stageTotal}
                      </p>
                    </div>

                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-foreground/70 transition-all duration-300"
                        style={{ width: `${stageProgress}%` }}
                      />
                    </div>
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      stageOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {stageOpen && (
                  <div className="border-t px-4 py-3 space-y-2">
                    {stage.tasks.map((task) => (
                      <label
                        key={task.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                          task.completed
                            ? "bg-muted/40 border-border"
                            : "bg-background hover:bg-muted/20"
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
                                ? "line-through text-muted-foreground"
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