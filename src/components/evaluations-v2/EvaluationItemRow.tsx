import { CheckCircle2, CircleAlert, FileText, ListChecks, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  EvaluationResponseInput,
  EvaluationTemplateItem,
  EvaluationTemplateItemOption,
} from "@/utils/evaluationV2";
import { resolveEffectiveInputType } from "@/lib/resolveEffectiveInputType";

type Props = {
  item: EvaluationTemplateItem;
  response?: EvaluationResponseInput;
  onChange: (value: EvaluationResponseInput) => void;
};

type NormalizedInputType = "boolean" | "score" | "select" | "text";

function getScoreRange(item: EvaluationTemplateItem) {
  const min = Number(item.min_score ?? 1);
  const max = Number(item.max_score ?? 5);

  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    return [1, 2, 3, 4, 5];
  }

  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function normalizeInputType(item: EvaluationTemplateItem): NormalizedInputType {
  return resolveEffectiveInputType(item);
}

function getInputLabel(inputType: NormalizedInputType) {
  switch (inputType) {
    case "boolean":
      return "Pass / Fail";
    case "score":
      return "Rate";
    case "select":
      return "Choose";
    case "text":
      return "Note";
    default:
      return "Response";
  }
}

function getInputIcon(inputType: NormalizedInputType) {
  switch (inputType) {
    case "boolean":
      return ListChecks;
    case "score":
      return Star;
    case "select":
      return CircleAlert;
    case "text":
      return FileText;
    default:
      return ListChecks;
  }
}

function ChoiceChip({
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
        "h-11 rounded-2xl border px-4 text-sm font-semibold transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-primary/30",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_rgba(255,255,255,0.03)]"
          : "border-white/10 bg-white/[0.02] text-foreground hover:border-white/20 hover:bg-white/[0.04]"
      )}
    >
      {children}
    </button>
  );
}

function ScoreChip({
  active,
  value,
  onClick,
}: {
  active?: boolean;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[68px] min-w-[64px] flex-col items-center justify-center rounded-2xl border px-3 py-2 transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-primary/30",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_rgba(255,255,255,0.03)]"
          : "border-white/10 bg-white/[0.02] text-foreground hover:border-white/20 hover:bg-white/[0.04]"
      )}
    >
      <span className="text-base font-semibold leading-none">{value}</span>
      <span
        className={cn(
          "mt-2 text-[11px] font-medium uppercase tracking-wide",
          active ? "text-primary-foreground/80" : "text-muted-foreground"
        )}
      >
        Score
      </span>
    </button>
  );
}

function DotChip({
  active,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-primary/30",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_rgba(255,255,255,0.03)]"
          : "border-white/10 bg-white/[0.02] text-foreground hover:border-white/20 hover:bg-white/[0.04]"
      )}
    >
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

export default function EvaluationItemRow({
  item,
  response,
  onChange,
}: Props) {
  const resolvedInputType = normalizeInputType(item);
  const isRequired = item.is_required !== false;  

  const answered =
    typeof response?.response_check === "boolean" ||
    (response?.response_score !== null &&
      response?.response_score !== undefined) ||
    (response?.response_text ?? "").trim().length > 0;

  const parsedOptions = Array.isArray(item.options_json)
    ? item.options_json
    : [];

  type ParsedOptionLike =
    | EvaluationTemplateItemOption
    | string
    | number
    | boolean
    | null;

  const normalizedSelectOptions = parsedOptions.map((option, index) => {
  const optionValue = option as ParsedOptionLike;
  const isObject = typeof optionValue === "object" && optionValue !== null;

  const rawLabel = isObject
    ? String(
        optionValue.label ??
          optionValue.value ??
          optionValue.score ??
          "",
      ).trim()
    : String(optionValue ?? "").trim();

  const rawValue = isObject
    ? optionValue.value
    : optionValue;

  const optionScore =
    isObject && typeof optionValue.score === "number"
      ? optionValue.score
      : null;

  const safeLabel =
    rawLabel === "true"
      ? "Yes"
      : rawLabel === "false"
        ? "No"
        : rawLabel || String(optionScore ?? index + 1);

  const normalizedRawValue =
    typeof rawValue === "string" ? rawValue.trim() : rawValue;

  const safeValue =
    normalizedRawValue !== null &&
    normalizedRawValue !== undefined &&
    normalizedRawValue !== ""
      ? String(normalizedRawValue)
      : optionScore !== null
        ? String(optionScore)
        : String(index + 1);

  return {
    label: safeLabel,
    value: safeValue,
    score: optionScore,
  };
});

  const useDotStyle =
    normalizedSelectOptions.length > 0 &&
    normalizedSelectOptions.length <= 10 &&
    normalizedSelectOptions.every((entry) => /^([1-9]|10)$/.test(entry.label));

  const InputIcon = getInputIcon(resolvedInputType);
  const statusLabel = answered
  ? "Answered"
  : isRequired
    ? "Required"
    : "Optional";

  return (
    <div
      className={cn(
        "rounded-3xl border p-5 transition-all duration-150",
        answered
          ? "border-white/10 bg-white/[0.03] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]"
          : isRequired
            ? "border-white/8 bg-white/[0.018]"
            : "border-white/5 bg-white/[0.012]"
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{item.label}</p>

            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                answered
                  ? "border border-primary/15 bg-primary/8 text-primary"
                  : isRequired
                    ? "border border-white/10 bg-white/[0.03] text-foreground/80"
                    : "border border-white/8 bg-transparent text-muted-foreground"
              )}
            >
              {answered ? <CheckCircle2 className="h-3 w-3" /> : null}
              {statusLabel}
            </span>
          </div>

          {item.description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            <InputIcon className="h-3 w-3" />
            {getInputLabel(resolvedInputType)}
          </span>

          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {isRequired ? "Required item" : "Optional item"}
          </span>
        </div>
      </div>

      {resolvedInputType === "boolean" && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Mark whether this checkpoint was clearly met.
          </div>

          <div className="flex flex-wrap gap-2">
            <ChoiceChip
              active={response?.response_check === true}
              onClick={() => {
                const isActive = response?.response_check === true;

                onChange({
                  template_item_id: item.id,
                  response_check: isActive ? null : true,
                  response_score: isActive ? null : 1,
                  response_text: null,
                });
              }}
            >
              Yes
            </ChoiceChip>

            <ChoiceChip
              active={response?.response_check === false}
              onClick={() => {
                const isActive = response?.response_check === false;

                onChange({
                  template_item_id: item.id,
                  response_check: isActive ? null : false,
                  response_score: isActive ? null : 0,
                  response_text: null,
                });
              }}
            >
              No
            </ChoiceChip>
          </div>
        </div>
      )}

      {resolvedInputType === "score" && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Rate the quality of this area based on what happened in class.
          </div>

          <div className="flex flex-wrap gap-2">
            {getScoreRange(item).map((value) => {
              const isActive = response?.response_score === value;

              return (
                <ScoreChip
                  key={value}
                  active={isActive}
                  value={value}
                  onClick={() =>
                    onChange({
                      template_item_id: item.id,
                      response_check: null,
                      response_score: isActive ? null : value,
                      response_text: null,
                    })
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {resolvedInputType === "select" && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Choose the option that best matches the coach’s performance.
          </div>

          {normalizedSelectOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {normalizedSelectOptions.map((option, index) => {
                const isActive =
                  String(response?.response_text ?? "") === String(option.value) ||
                  (typeof response?.response_score === "number" &&
                    typeof option.score === "number" &&
                    response.response_score === option.score);

                const handleSelect = () => {
                  onChange({
                    template_item_id: item.id,
                    response_check: null,
                    response_score: isActive ? null : option.score ?? null,
                    response_text: isActive ? null : String(option.value),
                  });
                };
                if (useDotStyle) {
                  return (
                    <DotChip
                      key={`${item.id}-${index}-${String(option.value)}`}
                      active={isActive}
                      label={option.label}
                      onClick={handleSelect}
                    />
                  );
                }

                return (
                  <ChoiceChip
                    key={`${item.id}-${index}-${String(option.value)}`}
                    active={isActive}
                    onClick={handleSelect}
                  >
                    {option.label}
                  </ChoiceChip>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-amber-400">
              No options configured for this item.
            </div>
          )}
        </div>
      )}

      {resolvedInputType === "text" && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Add a short note or example to support your observation.
          </div>

          <Input
            value={response?.response_text ?? ""}
            placeholder="Add note..."
            className="h-11 rounded-2xl border-white/10 bg-white/[0.02]"
            onChange={(e) =>
              onChange({
                template_item_id: item.id,
                response_check: null,
                response_score: null,
                response_text: e.target.value,
              })
            }
          />

          <div className="text-xs text-muted-foreground">
            Notes save as you type
          </div>
        </div>
      )}
    </div>
  );
}
