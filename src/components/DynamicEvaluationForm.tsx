import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { NormalizedEvaluationTemplate } from "@/data/supabaseEvaluationTemplates";

type Props = {
  template: NormalizedEvaluationTemplate;
  saving?: boolean;
  onSubmit: (
    responses: Record<string, number | boolean>,
    notes?: string
  ) => Promise<void> | void;
};

export default function DynamicEvaluationForm({
  template,
  saving = false,
  onSubmit,
}: Props) {
  const [responses, setResponses] = useState<Record<string, number | boolean>>(
    {}
  );
  const [notes, setNotes] = useState("");

  const sortedSections = useMemo(() => {
    return [...(template.sections ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
  }, [template.sections]);

  const setResponse = (code: string, value: number | boolean) => {
    setResponses((prev) => ({ ...prev, [code]: value }));
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {sortedSections.map((section, sectionIndex) => {
        const sortedItems = [...(section.items ?? [])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );

        return (
          <div
            key={section.code ?? section.id ?? `section-${sectionIndex}`}
            className="space-y-3 min-w-0"
          >
            <h2 className="text-sm font-semibold">
              {section.title ?? `Section ${sectionIndex + 1}`}
            </h2>

            <div className="overflow-hidden rounded-lg border">
              <div className="divide-y">
                {sortedItems.map((item, itemIndex) => {
                  const itemCode =
                    item.code ?? `${section.code ?? sectionIndex}-${itemIndex}`;
                  const itemType = item.type ?? "boolean";
                  const itemLabel = item.label ?? itemCode;
                  const value = responses[itemCode];

                  if (itemType === "boolean") {
                    return (
                      <div
                        key={itemCode}
                        className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="min-w-0 text-sm break-words">
                          {itemLabel}
                        </span>

                        <div className="flex w-full gap-2 sm:w-auto sm:flex-none">
                          <button
                            type="button"
                            onClick={() => setResponse(itemCode, true)}
                            className={cn(
                              "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors sm:flex-none sm:px-3 sm:py-1.5",
                              value === true
                                ? "border-success/30 bg-success/10 text-success"
                                : "hover:bg-muted"
                            )}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setResponse(itemCode, false)}
                            className={cn(
                              "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors sm:flex-none sm:px-3 sm:py-1.5",
                              value === false
                                ? "border-destructive/30 bg-destructive/10 text-destructive"
                                : "hover:bg-muted"
                            )}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (itemType === "scale") {
                    const min = item.min ?? 1;
                    const max = item.max ?? 5;
                    const range = Array.from(
                      { length: max - min + 1 },
                      (_, i) => min + i
                    );

                    return (
                      <div
                        key={itemCode}
                        className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="min-w-0 text-sm break-words">
                          {itemLabel}
                        </span>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          {range.map((optionValue) => (
                            <button
                              key={optionValue}
                              type="button"
                              onClick={() => setResponse(itemCode, optionValue)}
                              className={cn(
                                "h-10 min-w-10 rounded-md border px-3 text-xs font-medium transition-colors",
                                value === optionValue
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              )}
                            >
                              {optionValue}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={itemCode}
                      className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="min-w-0 text-sm break-words">
                        {itemLabel}
                      </span>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {(item.options ?? []).map((optionValue) => (
                          <button
                            key={optionValue}
                            type="button"
                            onClick={() => setResponse(itemCode, optionValue)}
                            className={cn(
                              "rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                              value === optionValue
                                ? "border-primary bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                          >
                            {optionValue}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">General Notes</h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional observations..."
          rows={4}
          className="w-full"
        />
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={saving}
        onClick={() => onSubmit(responses, notes)}
      >
        {saving ? "Saving..." : "Save Evaluation"}
      </Button>
    </div>
  );
}