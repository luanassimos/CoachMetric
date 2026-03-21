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
  const [responses, setResponses] = useState<Record<string, number | boolean>>({});
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
    <div className="space-y-6">
      {sortedSections.map((section, sectionIndex) => {
        const sortedItems = [...(section.items ?? [])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );

        return (
          <div
            key={section.code ?? section.id ?? `section-${sectionIndex}`}
            className="space-y-3"
          >
            <h2 className="text-sm font-semibold">
              {section.title ?? `Section ${sectionIndex + 1}`}
            </h2>

            <div className="divide-y rounded-lg border">
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
                      className="flex items-center justify-between py-3 px-4"
                    >
                      <span className="text-sm">{itemLabel}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setResponse(itemCode, true)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
                            value === true
                              ? "bg-success/10 text-success border-success/30"
                              : "hover:bg-muted"
                          )}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setResponse(itemCode, false)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
                            value === false
                              ? "bg-destructive/10 text-destructive border-destructive/30"
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
                      className="flex items-center justify-between py-3 px-4"
                    >
                      <span className="text-sm">{itemLabel}</span>
                      <div className="flex gap-1">
                        {range.map((optionValue) => (
                          <button
                            key={optionValue}
                            type="button"
                            onClick={() => setResponse(itemCode, optionValue)}
                            className={cn(
                              "w-9 h-9 text-xs font-medium rounded-md border transition-colors",
                              value === optionValue
                                ? "bg-primary text-primary-foreground border-primary"
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
                    className="flex items-center justify-between py-3 px-4"
                  >
                    <span className="text-sm">{itemLabel}</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {(item.options ?? []).map((optionValue) => (
                        <button
                          key={optionValue}
                          type="button"
                          onClick={() => setResponse(itemCode, optionValue)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
                            value === optionValue
                              ? "bg-primary text-primary-foreground border-primary"
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
        );
      })}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">General Notes</h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional observations..."
          rows={3}
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