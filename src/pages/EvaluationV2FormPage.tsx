import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useEvaluationResponses } from "@/hooks/useEvaluationResponses";
import { useActiveEvaluationTemplate } from "@/hooks/useActiveEvaluationTemplate";
import { useStudio } from "@/contexts/StudioContext";
import EvaluationSection from "@/components/evaluations-v2/EvaluationSection";
import EvaluationSummarySidebar from "@/components/evaluations-v2/EvaluationSummarySidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  calculateEvaluationScores,
  filterItemsByCondition,
  sanitizeResponsesByTemplate,
  type EvaluationResponseInput,
  type EvaluationV2Context,
} from "@/utils/evaluationV2";

function isAnswered(response?: EvaluationResponseInput) {
  if (!response) return false;
  if (typeof response.response_check === "boolean") return true;
  if (typeof response.response_score === "number") return true;
  if ((response.response_text ?? "").trim().length > 0) return true;
  return false;
}

const SECTION_ORDER = [
  "pre_class",
  "first_timer_intro",
  "intro",
  "class",
  "post_workout",
];

function getSectionRank(section: {
  module_key?: string | null;
  display_order?: number;
}) {
  const moduleKey = String(section.module_key ?? "").toLowerCase().trim();
  const index = SECTION_ORDER.indexOf(moduleKey);

  if (index >= 0) return index;
  return 1000 + Number(section.display_order ?? 0);
}

function formatSectionLabel(moduleKey?: string | null) {
  const key = String(moduleKey ?? "").toLowerCase().trim();

  switch (key) {
    case "pre_class":
      return "Pre-Class";
    case "first_timer_intro":
      return "First Timer Intro";
    case "intro":
      return "Intro";
    case "class":
      return "Class";
    case "post_workout":
      return "Post-Workout";
    default:
      return key
        ? key
            .split("_")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ")
        : "Section";
  }
}

function getSaveStateLabel(
  saveState: "idle" | "saving" | "saved" | "error",
  saving: boolean,
) {
  if (saving || saveState === "saving") return "Saving changes";
  if (saveState === "saved") return "All changes saved";
  if (saveState === "error") return "Save error";
  return "Ready";
}

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/8 bg-white/[0.03] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function EvaluationV2FormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { selectedStudioId, setSelectedStudioId, isReady } = useStudio();

  const routeStudioId = searchParams.get("studio");
const scopedStudio =
  routeStudioId && routeStudioId !== "all"
    ? routeStudioId
    : selectedStudioId && selectedStudioId !== "all"
      ? selectedStudioId
      : null;
      useEffect(() => {
  if (!routeStudioId || routeStudioId === "all") return;

  if (routeStudioId !== selectedStudioId) {
    setSelectedStudioId(routeStudioId as string | "all");
  }
}, [routeStudioId, selectedStudioId, setSelectedStudioId]);

  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const evaluationQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ["evaluation-v2", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const templateQuery = useActiveEvaluationTemplate(selectedStudioId);
  const responses = useEvaluationResponses(id);

  const evaluationSnapshotTemplate = useMemo(() => {
    const snapshot = evaluationQuery.data?.template_snapshot;

    if (!snapshot || typeof snapshot !== "object") return null;

    return snapshot as any;
  }, [evaluationQuery.data?.template_snapshot]);

  const resolvedTemplate = evaluationSnapshotTemplate ?? templateQuery.data ?? null;

  const [localResponses, setLocalResponses] = useState<
    Record<string, EvaluationResponseInput | undefined>
  >({});

  useEffect(() => {
    setLocalResponses((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(responses.responsesByItemId);

      if (prevKeys.length === nextKeys.length) {
        const isSame = nextKeys.every((key) => {
          const prevValue = prev[key];
          const nextValue = responses.responsesByItemId[key];

          return (
            prevValue?.response_check === nextValue?.response_check &&
            prevValue?.response_score === nextValue?.response_score &&
            prevValue?.response_text === nextValue?.response_text
          );
        });

        if (isSame) return prev;
      }

      return responses.responsesByItemId;
    });
  }, [responses.responsesByItemId]);

  useEffect(() => {
    if (saveState !== "saved") return;

    const timeout = window.setTimeout(() => {
      setSaveState("idle");
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [saveState]);

  const context: EvaluationV2Context = {
    role: evaluationQuery.data?.coach_role ?? "lead",
    shift: evaluationQuery.data?.shift_type ?? "am",
    greenStar: Boolean(evaluationQuery.data?.green_star_present),
  };

  const visibleSections = useMemo(() => {
    const sections = resolvedTemplate?.sections ?? [];

    return [...sections]
      .sort((a, b) => getSectionRank(a) - getSectionRank(b))
      .map((section) => ({
        ...section,
        items: section.items.filter((item: any) =>
          filterItemsByCondition(item, context),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [resolvedTemplate?.sections, context.role, context.shift, context.greenStar]);

  const sanitizedLocalResponses = useMemo(() => {
    return sanitizeResponsesByTemplate({
      sections: visibleSections,
      responsesByItemId: localResponses,
      context,
    });
  }, [visibleSections, localResponses, context]);

  const totalItems = useMemo(() => {
    return visibleSections.reduce(
      (total, section) => total + section.items.length,
      0,
    );
  }, [visibleSections]);

  const answeredItems = useMemo(() => {
    return visibleSections.reduce((total, section) => {
      return (
        total +
        section.items.filter((item) => isAnswered(sanitizedLocalResponses[item.id]))
          .length
      );
    }, 0);
  }, [visibleSections, sanitizedLocalResponses]);

  const completionPercent =
    totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;
  const remainingItems = Math.max(totalItems - answeredItems, 0);

  const scores = useMemo(() => {
    return calculateEvaluationScores({
      sections: visibleSections,
      responsesByItemId: sanitizedLocalResponses,
      context,
    });
  }, [visibleSections, sanitizedLocalResponses, context]);

  const sectionSnapshots = useMemo(() => {
    return visibleSections.map((section) => {
      const answered = section.items.filter((item) =>
        isAnswered(sanitizedLocalResponses[item.id]),
      ).length;
      const total = section.items.length;
      const complete = total > 0 && answered === total;
      const percent = total > 0 ? Math.round((answered / total) * 100) : 0;

      return {
        id: section.id,
        label: section.title || formatSectionLabel(section.module_key),
        answered,
        total,
        complete,
        percent,
      };
    });
  }, [visibleSections, sanitizedLocalResponses]);

  const persistScoreMutation = useMutation({
    mutationFn: async (
      nextScores: ReturnType<typeof calculateEvaluationScores>,
    ) => {
      if (!id) throw new Error("Missing evaluation id");

      const finalScore = nextScores.final_score ?? 0;
      const normalizedScorePercent = nextScores.normalized_score_percent ?? 0;

      const sectionScoreMap = visibleSections.reduce<Record<string, number>>(
        (acc, section) => {
          const scorableItems = section.items.filter(
            (item) => item.input_type !== "text",
          );

          const earned = scorableItems.reduce((sum, item) => {
            const response = sanitizedLocalResponses[item.id];
            const weight = Number(item.weight ?? 1);

            if (!response) return sum;

            if (item.input_type === "boolean") {
              return sum + (response.response_check === true ? 1 * weight : 0);
            }

            if (item.input_type === "score") {
              return sum + Number(response.response_score ?? 0) * weight;
            }

            if (item.input_type === "select") {
              if (typeof response.response_score === "number") {
                return sum + Number(response.response_score) * weight;
              }

              const matchedOption = (item.options_json ?? []).find(
                (option: any) =>
                  String(option.value) === String(response.response_text),
              );

              return sum + Number(matchedOption?.score ?? 0) * weight;
            }

            return sum;
          }, 0);

          const max = scorableItems.reduce((sum, item) => {
            const weight = Number(item.weight ?? 1);

            if (item.input_type === "boolean") {
              return sum + 1 * weight;
            }

            if (item.input_type === "score") {
              return sum + Number(item.max_score ?? 5) * weight;
            }

            if (item.input_type === "select") {
              const optionScores = (item.options_json ?? [])
                .map((option: any) => option.score)
                .filter((score: any): score is number => typeof score === "number");

              if (optionScores.length === 0) return sum;
              return sum + Math.max(...optionScores) * weight;
            }

            return sum;
          }, 0);

          const pct =
            max > 0
              ? Math.max(0, Math.min(100, Math.round((earned / max) * 100)))
              : 0;

          const moduleKey = String(section.module_key ?? "").toLowerCase().trim();

          if (moduleKey) {
            acc[moduleKey] = pct;
          }

          return acc;
        },
        {},
      );

      const responsesJsonPayload = Object.fromEntries(
        Object.entries(sanitizedLocalResponses)
          .filter(([, value]) => {
            if (!value) return false;
            if (typeof value.response_check === "boolean") return true;
            if (typeof value.response_score === "number") return true;
            if ((value.response_text ?? "").trim().length > 0) return true;
            return false;
          })
          .map(([itemId, value]) => [
            itemId,
            {
              response_check: value?.response_check ?? null,
              response_score: value?.response_score ?? null,
              response_text: value?.response_text ?? null,
            },
          ]),
      );

      const { error } = await supabase
        .from("evaluations")
        .update({
          pre_class_score: sectionScoreMap.pre_class ?? 0,
          first_timer_intro_score: sectionScoreMap.first_timer_intro ?? 0,
          intro_score: sectionScoreMap.intro ?? 0,
          class_score: sectionScoreMap.class ?? 0,
          post_workout_score: sectionScoreMap.post_workout ?? 0,
          class_performance_score: nextScores.class_performance_score,
          execution_score: nextScores.execution_score,
          experience_score: nextScores.experience_score,
          green_star_score: nextScores.green_star_score,
          performance_level: nextScores.performance_level,
          final_score: finalScore,
          normalized_score_percent: normalizedScorePercent,
          responses_json: responsesJsonPayload,
          template_snapshot: evaluationQuery.data?.template_snapshot ?? resolvedTemplate,
        })
        .eq("id", id);

      if (error) throw error;
    },
  });

  const saveProgressMutation = useMutation({
    mutationFn: async () => {
      const nextScores = calculateEvaluationScores({
        sections: visibleSections,
        responsesByItemId: sanitizedLocalResponses,
        context,
      });

      await persistScoreMutation.mutateAsync(nextScores);
    },
    onMutate: () => {
      setSaveState("saving");
    },
    onSuccess: () => {
      setSaveState("saved");
      toast.success("Progress saved");
    },
    onError: (error: any) => {
      console.error("saveProgressMutation error", error);
      setSaveState("error");
      toast.error(error?.message ?? "Failed to save progress");
    },
  });

  const saving =
    saveProgressMutation.isPending || persistScoreMutation.isPending;

  if (
    evaluationQuery.isLoading ||
    (!evaluationSnapshotTemplate && templateQuery.isLoading) ||
    responses.isLoading
  ) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <SurfaceCard className="p-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Evaluation V2...
          </div>
        </SurfaceCard>
      </div>
    );
  }

  if (
    evaluationQuery.isError ||
    (!evaluationSnapshotTemplate && templateQuery.isError) ||
    responses.isError
  ) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <SurfaceCard className="border-red-500/20 bg-red-500/5 p-8">
          <div className="text-sm text-red-300">Failed to load Evaluation V2.</div>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate(`/evaluations/new?studio=${scopedStudio}`)}
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <SurfaceCard className="overflow-hidden">
          <div className="border-b border-white/8 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Guided Evaluation
                </div>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Coach Evaluation
                </h1>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Review the session, capture observations, and keep the score
                  updated in real time.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                    saveState === "error"
                      ? "border-red-500/20 bg-red-500/10 text-red-300"
                      : saveState === "saved"
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground",
                  )}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : saveState === "saved" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Clock3 className="h-3.5 w-3.5" />
                  )}
                  {getSaveStateLabel(saveState, saving)}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await saveProgressMutation.mutateAsync();
                  }}
                  disabled={saving}
                  className="w-fit"
                >
                  Save progress
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Evaluator
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {evaluationQuery.data?.evaluator_name || "Unknown"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Class Type
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {evaluationQuery.data?.class_type || "General"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Date
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {evaluationQuery.data?.class_date || "Not set"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Time
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {evaluationQuery.data?.class_time || "Not set"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Overall Progress
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {answeredItems}/{totalItems}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {completionPercent}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {remainingItems === 0
                      ? "Everything answered"
                      : `${remainingItems} item${
                          remainingItems === 1 ? "" : "s"
                        } remaining`}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-primary/50 transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <SurfaceCard className="p-4 sm:p-5">
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Evaluation Flow
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Move section by section and complete every required checkpoint.
                  </p>
                </div>

                <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
                  {sectionSnapshots.filter((section) => section.complete).length}/
                  {sectionSnapshots.length} sections complete
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {sectionSnapshots.map((section) => (
                  <div
                    key={section.id}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      section.complete
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground",
                    )}
                  >
                    {section.label} · {section.answered}/{section.total}
                  </div>
                ))}
              </div>
            </div>
          </SurfaceCard>

          {visibleSections.map((section) => (
            <EvaluationSection
              key={section.id}
              section={section}
              responsesByItemId={sanitizedLocalResponses}
              onChange={async (input) => {
                if (!id) {
                  toast.error("Missing evaluation id");
                  return;
                }

                if (!input.template_item_id) {
                  console.error("Missing template_item_id", input);
                  toast.error("Invalid template item id");
                  return;
                }

                const uuidLike =
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

                if (!uuidLike.test(input.template_item_id)) {
                  console.error(
                    "Non-UUID template_item_id detected",
                    input.template_item_id,
                    input,
                  );
                  toast.error("Invalid template item id");
                  return;
                }

                const nextResponsesRaw: Record<
                  string,
                  EvaluationResponseInput | undefined
                > = {
                  ...localResponses,
                  [input.template_item_id]: input,
                };

                const nextResponses = sanitizeResponsesByTemplate({
                  sections: visibleSections,
                  responsesByItemId: nextResponsesRaw,
                  context,
                });

                setLocalResponses(nextResponsesRaw);
                setSaveState("saving");

                try {
                  await responses.saveResponse({
                    ...input,
                    template_item_id: input.template_item_id,
                  });

                  const nextScores = calculateEvaluationScores({
                    sections: visibleSections,
                    responsesByItemId: nextResponses,
                    context,
                  });

                  await persistScoreMutation.mutateAsync(nextScores);
                  setSaveState("saved");
                } catch (error) {
                  console.error("Evaluation V2 onChange error", error);
                  setSaveState("error");
                  toast.error("Failed to save response");
                }
              }}
            />
          ))}
        </div>

        <EvaluationSummarySidebar
          scores={scores}
          totalItems={totalItems}
          answeredItems={answeredItems}
          saving={saving}
          saveState={saveState}
          onSaveProgress={async () => {
            await saveProgressMutation.mutateAsync();
          }}
          onDoneReviewing={async () => {
            try {
              if (!id) {
                toast.error("Missing evaluation id");
                return;
              }

              await saveProgressMutation.mutateAsync();
              toast.success("Review saved");

              navigate(`/evaluations/${id}?studio=${scopedStudio}`);
            } catch (error) {
              console.error("Done Reviewing error", error);
              toast.error("Failed to finish review");
            }
          }}
        />
      </div>
    </div>
  );
}