import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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
  const [openSections, setOpenSections] = useState<string[]>([]);

  const sortedSections = useMemo(() => {
    return [...(template.sections ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
  }, [template.sections]);
  const totalItems = useMemo(() => {
  return sortedSections.reduce(
    (acc, section) => acc + (section.items?.length ?? 0),
    0
  );
}, [sortedSections]);

const answeredItems = useMemo(() => {
  return Object.keys(responses).length;
}, [responses]);

  useEffect(() => {
    if (sortedSections.length > 0) {
      const firstSectionKey = getSectionKey(sortedSections[0], 0);
      setOpenSections([firstSectionKey]);
    }
  }, [sortedSections]);

  const setResponse = (code: string, value: number | boolean) => {
    setResponses((prev) => ({ ...prev, [code]: value }));
  };
const canSave = answeredItems > 0 && !saving;
  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionKey)
        ? prev.filter((key) => key !== sectionKey)
        : [...prev, sectionKey]
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      <div className="space-y-1">
  <h2 className="text-lg font-semibold">Evaluation</h2>
  <p className="text-sm text-muted-foreground">
    Complete the checklist and scoring items below
  </p>
  <p className="text-xs text-muted-foreground">
    {answeredItems} of {totalItems} items completed
  </p>
</div>

      <div className="space-y-3">
        {sortedSections.map((section, sectionIndex) => {
          const sortedItems = [...(section.items ?? [])].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
          );

          const sectionKey = getSectionKey(section, sectionIndex);
          const isOpen = openSections.includes(sectionKey);

          return (
            <div
  key={sectionKey}
  className="card-elevated overflow-hidden border border-white/5 bg-white/[0.02] p-0"
>
              <button
                type="button"
                onClick={() => toggleSection(sectionKey)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold sm:text-base">
                    {section.title ?? `Section ${sectionIndex + 1}`}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {sortedItems.length} item{sortedItems.length !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden rounded-full border border-white/10 bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground sm:block">
                    {isOpen ? "Open" : "Collapsed"}
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-white/5">
                  <div className="divide-y divide-white/5">
                    {sortedItems.map((item, itemIndex) => {
                      const itemCode =
                        item.code ?? `${section.code ?? sectionIndex}-${itemIndex}`;
                      const itemType = item.type ?? "boolean";
                      const itemLabel = item.label ?? itemCode;
                      const value = responses[itemCode];

                      if (itemType === "boolean") {
                        return (
                          <FormRow
                            key={itemCode}
                            label={itemLabel}
                            controls={
                              <div className="flex items-center gap-2">
                                <ToggleChip
                                  active={value === true}
                                  onClick={() => setResponse(itemCode, true)}
                                >
                                  Yes
                                </ToggleChip>

                                <ToggleChip
                                  active={value === false}
                                  onClick={() => setResponse(itemCode, false)}
                                >
                                  No
                                </ToggleChip>
                              </div>
                            }
                          />
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
                          <FormRow
                            key={itemCode}
                            label={itemLabel}
                            controls={
                              <div className="flex flex-wrap gap-2 sm:justify-end">
                                {range.map((optionValue) => (
                                  <ScaleChip
                                    key={optionValue}
                                    active={value === optionValue}
                                    onClick={() =>
                                      setResponse(itemCode, optionValue)
                                    }
                                  >
                                    {optionValue}
                                  </ScaleChip>
                                ))}
                              </div>
                            }
                          />
                        );
                      }

                      return (
                        <FormRow
                          key={itemCode}
                          label={itemLabel}
                          controls={
                            <div className="flex flex-wrap gap-2 sm:justify-end">
                              {(item.options ?? []).map((optionValue) => (
                                <ScaleChip
                                  key={String(optionValue)}
                                  active={value === optionValue}
                                  onClick={() =>
                                    setResponse(
                                      itemCode,
                                      optionValue as number | boolean
                                    )
                                  }
                                >
                                  {String(optionValue)}
                                </ScaleChip>
                              ))}
                            </div>
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card-elevated space-y-3 p-4 sm:p-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">General Notes</h3>
          <p className="text-sm text-muted-foreground">
            Add any additional observations for this evaluation
          </p>
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional observations..."
          rows={5}
          className="w-full"
        />
      </div>

      <div className="card-elevated flex items-center justify-end p-3 sm:p-4">
        <Button
  type="button"
  className="w-full sm:w-auto sm:min-w-[220px]"
  disabled={!canSave}
  onClick={() => onSubmit(responses, notes)}
>
  {saving ? "Saving..." : "Save Evaluation"}
</Button>
      </div>
    </div>
  );
}

function getSectionKey(section: { code?: string; id?: string }, index: number) {
  return section.code ?? section.id ?? `section-${index}`;
}

function FormRow({
  label,
  controls,
}: {
  label: string;
  controls: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5">
      <div className="min-w-0">
        <span className="block text-sm leading-5 text-foreground break-words">
          {label}
        </span>
      </div>

      <div className="shrink-0">{controls}</div>
    </div>
  );
}

function ToggleChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
        active
  ? "border-primary bg-primary text-primary-foreground"
  : "border-white/10 bg-transparent text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function ScaleChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 min-w-8 rounded-full border px-2.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/10 bg-transparent text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}