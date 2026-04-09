import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, CircleDashed, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  EvaluationResponseInput,
  EvaluationTemplateSection,
} from "@/utils/evaluationV2";
import EvaluationItemRow from "./EvaluationItemRow";

type Props = {
  section: EvaluationTemplateSection;
  responsesByItemId: Record<string, EvaluationResponseInput | undefined>;
  onChange: (input: EvaluationResponseInput) => void;
};

function isAnswered(response?: EvaluationResponseInput) {
  if (!response) return false;
  if (typeof response.response_check === "boolean") return true;
  if (typeof response.response_score === "number") return true;
  if ((response.response_text ?? "").trim().length > 0) return true;
  return false;
}

function formatModuleLabel(moduleKey?: string | null) {
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

export default function EvaluationSection({
  section,
  responsesByItemId,
  onChange,
}: Props) {
  const requiredItems = section.items.filter(
    (item) => item.is_required !== false,
  );

  const answeredCount = requiredItems.filter((item) =>
    isAnswered(responsesByItemId[item.id]),
  ).length;

  const totalCount = requiredItems.length;
  const progressPercent =
    totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const isComplete = answeredCount === totalCount && totalCount > 0;
  const remainingCount = Math.max(totalCount - answeredCount, 0);
  const sectionLabel = section.title || formatModuleLabel(section.module_key);

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/8 bg-white/[0.03] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] transition-all",
        isComplete ? "ring-1 ring-primary/10" : "",
      )}
    >
      <Accordion
        type="single"
        collapsible
        defaultValue={section.id}
        className="w-full"
      >
        <AccordionItem value={section.id} className="border-none">
          <AccordionTrigger className="px-5 py-5 text-left hover:no-underline sm:px-6">
            <div className="flex w-full items-start justify-between gap-4 pr-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-lg font-semibold text-foreground">
                    {sectionLabel}
                  </div>

                  {isComplete ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-background/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      <CircleDashed className="h-3 w-3" />
                      In progress
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 uppercase tracking-[0.12em]">
                    <ClipboardList className="h-3 w-3" />
                    {formatModuleLabel(section.module_key)}
                  </span>

                  <span>
                    {remainingCount === 0
                      ? "All required items answered"
                      : `${remainingCount} required item${remainingCount === 1 ? "" : "s"} remaining`}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="rounded-full border border-white/10 bg-background/60 px-3 py-1 text-xs font-medium text-foreground">
                  {answeredCount}/{totalCount}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  required answered
                </div>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="mb-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <span>Section completion</span>
                <span>{progressPercent}%</span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isComplete ? "bg-primary/50" : "bg-white/25",
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-4">
              {section.items.map((item) => (
                <EvaluationItemRow
                  key={item.id}
                  item={item}
                  response={responsesByItemId[item.id]}
                  onChange={onChange}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
