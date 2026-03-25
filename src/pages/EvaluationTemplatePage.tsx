import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Search, Plus, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TemplateCard from "@/components/evaluation-templates/TemplateCard";
import { useEvaluationTemplates } from "@/hooks/useEvaluationTemplates";
import { useStudio } from "@/contexts/StudioContext";

export default function EvaluationTemplatePage() {
  const navigate = useNavigate();
  const { studioId: routeStudioId } = useParams<{ studioId: string }>();
  const [searchParams] = useSearchParams();
  const { selectedStudioId } = useStudio();
  const [search, setSearch] = useState("");

  const scopedStudioId =
    routeStudioId ||
    searchParams.get("studio") ||
    selectedStudioId ||
    "";

  const scopedQuery = scopedStudioId ? `?studio=${scopedStudioId}` : "";

  const {
    templates,
    loading,
    error,
    setDefaultTemplate,
    deleteTemplate,
  } = useEvaluationTemplates({
    studioId: scopedStudioId,
    search,
  });

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return templates;

    return templates.filter((template) => {
      const name = String(template.name ?? "").toLowerCase();
      const description = String(template.description ?? "").toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [templates, search]);

  const activeCount = templates.filter((template) => template.is_active).length;
  const defaultCount = templates.filter((template) => template.is_default).length;

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading templates...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-400">
        Failed to load evaluation templates.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <LayoutTemplate className="h-3.5 w-3.5" />
              Template Library
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Evaluation Templates
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Manage templates for Evaluation V2 for the selected studio.
            </p>
          </div>

          <Button
            onClick={() =>
              navigate(
                `/studios/${scopedStudioId}/evaluation-templates/new${scopedQuery}`,
              )
            }
            className="w-full lg:w-auto"
            disabled={!scopedStudioId}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Total Templates
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {templates.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Active
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Default Templates
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {defaultCount}
            </p>
          </div>
        </div>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates by name or description"
            className="pl-9"
          />
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <h2 className="text-lg font-semibold text-foreground">
            No templates found
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This studio does not have templates yet.
          </p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-10 text-center">
          <h2 className="text-lg font-semibold text-foreground">
            No matching templates
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try another name or clear the search.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() =>
                navigate(
                  `/studios/${scopedStudioId}/evaluation-templates/${template.id}/edit${scopedQuery}`,
                )
              }
              onSetDefault={async () => {
                try {
                  await setDefaultTemplate({
                    templateId: template.id,
                    templateStudioId: template.studio_id,
                  });
                  toast.success("Default template updated");
                } catch (error: any) {
                  console.error(error);
                  toast.error(
                    error.message ?? "Failed to set default template",
                  );
                }
              }}
              onDelete={async () => {
                const confirmed = window.confirm(
                  `Delete template "${template.name}"? This cannot be undone.`,
                );

                if (!confirmed) return;

                try {
                  await deleteTemplate(template.id);
                  toast.success("Template deleted");
                } catch (error: any) {
                  console.error(error);
                  toast.error(error.message ?? "Failed to delete template");
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}