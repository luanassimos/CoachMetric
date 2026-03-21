import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { createEvaluation } from "@/data/supabaseEvaluations";
import {
  getActiveEvaluationTemplateForStudio,
  type NormalizedEvaluationTemplate,
} from "@/data/supabaseEvaluationTemplates";
import { getCoachName } from "@/data/helpers";
import { useCoaches } from "@/hooks/useCoaches";

import DynamicEvaluationForm from "@/components/DynamicEvaluationForm";
import TemplateEditorDrawer from "@/components/TemplateEditorDrawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { buildLegacyCompatibleScores } from "@/lib/dynamicEvaluationScoring";

export default function NewEvaluationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { coaches, loading } = useCoaches();

  const [coachId, setCoachId] = useState("");
  const [activeTemplate, setActiveTemplate] =
    useState<NormalizedEvaluationTemplate | null>(null);

  const [templateName, setTemplateName] = useState("Legacy Evaluation");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [evaluatorName, setEvaluatorName] = useState("");
  const [className, setClassName] = useState("");
  const [classType, setClassType] = useState("");
  const [classDate, setClassDate] = useState("");
  const [classTime, setClassTime] = useState("");
  const [classSize, setClassSize] = useState("");

  const selectedCoach = useMemo(
    () => coaches.find((c) => c.id === coachId),
    [coaches, coachId]
  );

  const shouldUseDynamic = !!activeTemplate?.sections?.length;

  useEffect(() => {
    async function load() {
      if (!selectedCoach?.studio_id) {
        setActiveTemplate(null);
        setTemplateName("Legacy Evaluation");
        return;
      }

      setTemplateLoading(true);

      try {
        const template = await getActiveEvaluationTemplateForStudio(
          selectedCoach.studio_id
        );

        if (template) {
          setActiveTemplate(template);
          setTemplateName(template.name || "Active Template");
        } else {
          setActiveTemplate(null);
          setTemplateName("Legacy Evaluation");
        }
      } catch (error) {
        console.error(error);
        setActiveTemplate(null);
        setTemplateName("Legacy Evaluation");
      } finally {
        setTemplateLoading(false);
      }
    }

    load();
  }, [selectedCoach?.studio_id, drawerOpen]);

  if (loading) {
    return <div className="p-4 sm:p-6">Loading...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 space-y-4 sm:space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex w-fit items-center gap-2 text-sm text-foreground transition hover:text-primary"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold">New Evaluation</h1>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <span className="text-sm text-muted-foreground break-words">
              {templateLoading ? "Loading..." : `Using: ${templateName}`}
            </span>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              disabled={!selectedCoach?.studio_id}
              className="w-fit text-xs font-medium text-primary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Change
            </button>
          </div>

          {selectedCoach && (
            <p className="mt-1 text-sm text-muted-foreground">
              {getCoachName(selectedCoach)}
            </p>
          )}
        </div>
      </div>

      <div className="card-elevated space-y-4 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Setup</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select value={coachId} onValueChange={setCoachId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select coach" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {getCoachName(coach)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Evaluator name"
            value={evaluatorName}
            onChange={(e) => setEvaluatorName(e.target.value)}
            className="w-full"
          />

          <Input
            placeholder="Class name"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full"
          />

          <Input
            placeholder="Class type"
            value={classType}
            onChange={(e) => setClassType(e.target.value)}
            className="w-full"
          />

          <Input
            type="number"
            placeholder="Class size"
            value={classSize}
            onChange={(e) => setClassSize(e.target.value)}
            className="w-full"
          />

          <Input
            type="date"
            value={classDate}
            onChange={(e) => setClassDate(e.target.value)}
            className="w-full"
          />

          <Input
            type="time"
            value={classTime}
            onChange={(e) => setClassTime(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {shouldUseDynamic && activeTemplate ? (
        <div className="min-w-0">
          <DynamicEvaluationForm
            template={activeTemplate}
            onSubmit={async (data, dynamicNotes) => {
              try {
                if (!coachId || !classType || !classDate) {
                  toast.error("Missing required fields");
                  return;
                }

                const legacyScores = buildLegacyCompatibleScores(
                  activeTemplate,
                  data
                );

                await createEvaluation({
                  coach_id: coachId,
                  evaluator_name: evaluatorName || "Unknown",
                  class_date: classDate,
                  class_time: classTime || "",
                  class_name: className || classType,
                  class_type: classType,
                  class_size: Number(classSize) || 0,

                  pre_class_score: legacyScores.pre_class_score,
                  first_timer_intro_score:
                    legacyScores.first_timer_intro_score,
                  intro_score: legacyScores.intro_score,
                  class_score: legacyScores.class_score,
                  post_workout_score: legacyScores.post_workout_score,
                  final_score: legacyScores.final_score,
                  normalized_score_percent:
                    legacyScores.normalized_score_percent,

                  template_id: activeTemplate.id,
                  template_version: activeTemplate.version,
                  responses_json: data,
                  template_snapshot: activeTemplate,

                  notes_general: dynamicNotes || "",
                });

                await queryClient.invalidateQueries({
                  queryKey: ["evaluations"],
                });

                toast.success("Saved");
                navigate("/");
              } catch (err) {
                console.error(err);
                toast.error("Failed to save");
              }
            }}
          />
        </div>
      ) : (
        <div className="card-elevated p-4 sm:p-5">
          <div className="text-sm text-muted-foreground">
            Using legacy template
          </div>
        </div>
      )}

      {selectedCoach?.studio_id && (
        <TemplateEditorDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          studioId={selectedCoach.studio_id}
          studioName={selectedCoach.studio_id}
        />
      )}
    </div>
  );
}