type InputTypeLike = {
  input_type?: string | null;
  options_json?: unknown[] | null;
  min_score?: number | null;
  max_score?: number | null;
};

export function resolveEffectiveInputType(
  item: InputTypeLike,
): "boolean" | "score" | "select" | "text" {
  const raw = String(item.input_type ?? "").toLowerCase();

  // boolean
  if (["boolean", "yes_no", "pass_fail"].includes(raw)) return "boolean";

  // score
  if (["score", "scale", "rating", "number"].includes(raw)) return "score";

  // select
  if (["select", "choice", "dropdown"].includes(raw)) return "select";

  // fallback rules
  if (item.options_json?.length) return "select";
  if (item.min_score != null && item.max_score != null) return "score";

  return "boolean";
}
