import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  createEvaluationItem,
  createEvaluationSection,
  createEvaluationTemplate,
  deleteEvaluationItem,
  deleteEvaluationSection,
  getEvaluationTemplatesByStudio,
  getFullEvaluationTemplate,
  setActiveEvaluationTemplate,
  updateEvaluationItem,
  updateEvaluationSection,
  updateEvaluationTemplate,
} from "@/data/supabaseEvaluationTemplates";

import {
  EvaluationInputType,
  EvaluationTemplate,
  EvaluationTemplateItem,
  EvaluationTemplateSection,
} from "@/lib/types";

type FullSection = EvaluationTemplateSection & {
  items?: EvaluationTemplateItem[];
};

type FullTemplate = EvaluationTemplate & {
  sections?: FullSection[];
};

type Props = {
  studioId: string;
  studioName?: string;
};

const INPUT_TYPE_OPTIONS: EvaluationInputType[] = [
  "score",
  "select",
  "boolean",
  "text",
];

export default function EvaluationTemplateEditor({
  studioId,
  studioName,
}: Props) {
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<FullTemplate | null>(null);

  const [loading, setLoading] = useState(true);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [activatingTemplate, setActivatingTemplate] = useState(false);
  const [creatingSection, setCreatingSection] = useState(false);

  const [showCreateTemplateForm, setShowCreateTemplateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");

  const resolvedStudioName = useMemo(
    () => studioName || studioId,
    [studioName, studioId]
  );

  async function loadTemplates(nextTemplateId?: string) {
    if (!studioId) return;

    setLoading(true);

    const data = await getEvaluationTemplatesByStudio(studioId);
    setTemplates(data);

    let templateIdToLoad = nextTemplateId || selectedTemplateId;

    if (!templateIdToLoad && data.length > 0) {
      templateIdToLoad =
        data.find((item) => item.is_active)?.id ?? data[0].id;
      setSelectedTemplateId(templateIdToLoad);
    }

    if (templateIdToLoad) {
      const full = await getFullEvaluationTemplate(templateIdToLoad);
      setSelectedTemplate(full);
    } else {
      setSelectedTemplate(null);
    }

    setLoading(false);
  }

  async function loadSelectedTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const full = await getFullEvaluationTemplate(templateId);
    setSelectedTemplate(full);
  }

  useEffect(() => {
    loadTemplates();
  }, [studioId]);

  if (loading) {
    return <div className="p-4 sm:p-6">Loading template editor...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">
            Evaluation Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Studio {resolvedStudioName}
          </p>
        </div>

        <Button
          className="w-full sm:w-auto"
          onClick={() => setShowCreateTemplateForm((prev) => !prev)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* TEMPLATE LIST */}
      <div className="card-elevated p-4">
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <Button
              key={t.id}
              size="sm"
              className="w-full sm:w-auto"
              variant={
                selectedTemplateId === t.id ? "default" : "outline"
              }
              onClick={() => loadSelectedTemplate(t.id)}
            >
              {t.name}
            </Button>
          ))}
        </div>
      </div>

      {/* TEMPLATE */}
      {selectedTemplate && (
        <div className="card-elevated p-4 sm:p-5 space-y-4">
          <h2 className="text-lg font-semibold">Template</h2>

          <input
            value={selectedTemplate.name}
            onChange={(e) =>
              setSelectedTemplate((prev) =>
                prev ? { ...prev, name: e.target.value } : prev
              )
            }
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
      )}
    </div>
  );
}