import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

function loadEnvFile() {
  const envPath = path.join(projectRoot, ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

const BASE_DATE = new Date();
BASE_DATE.setHours(12, 0, 0, 0);

const EVALUATOR_POOLS = {
  nb: ["Luan Assimos", "Regional QA Lead", "Head Coach Review"],
  cc: ["District Manager", "Head Coach Review", "Regional QA Lead"],
  bg: ["Regional QA Lead", "District Manager", "Studio Support Lead"],
  tb: ["Regional QA Lead", "District Manager", "Ops Coach"],
  "kapolei-west": ["Regional QA Lead", "Performance Manager", "Studio Support Lead"],
  "pearl-ridge": ["District Manager", "Regional QA Lead", "Studio Support Lead"],
};

const CLASS_TYPES = ["Cardio", "Strength", "Hybrid"];
const SHIFT_TYPES = ["am", "midday", "pm", "weekend"];

const STUDIO_STORIES = {
  nb: {
    label: "Strongest studio with real depth and a few support cases",
    profiles: [
      "strong_consistent",
      "limited_coverage_promising",
      "developing_confidence",
      "below_standard_declining",
      "strong_intro_gap",
      "stable_acceptable",
      "strong_consistent",
      "preserve_existing_strong",
      "developing_confidence",
      "stable_acceptable",
      "strong_intro_gap",
      "at_risk_low_energy",
      "limited_coverage_due_soon",
      "strong_consistent",
      "stable_acceptable",
    ],
  },
  cc: {
    label: "Acceptable and stable with decent operational discipline",
    profiles: ["city_center_stable"],
  },
  "kapolei-west": {
    label: "Improving, but still below standard",
    profiles: ["improving_but_below"],
  },
  bg: {
    label: "Weak mostly because of actual coaching quality issues",
    profiles: ["preserve_existing_performance_risk"],
  },
  tb: {
    label: "Recovering from volatility, trending up but still imperfect",
    profiles: ["preserve_existing_volatile_recovery"],
  },
  "pearl-ridge": {
    label: "Weak mainly because of coverage and cadence gaps, not severe quality collapse",
    profiles: ["coverage_gap_capable"],
  },
};

const PROFILE_LIBRARY = {
  strong_consistent: {
    count: 4,
    dateOffsets: [12, 34, 67, 103],
    base: 93,
    trend: 6,
    jitter: 3,
    sectionOffsets: {
      pre_class: 3,
      first_timer_intro: 1,
      intro: 2,
      class: 6,
      post_workout: 4,
    },
    boosts: [/room control/i, /corrected improper form/i, /congratulated using specificity/i],
    penalties: [],
    note:
      "Reliable floor presence with good class control and clean operational habits.",
  },
  strong_intro_gap: {
    count: 4,
    dateOffsets: [9, 29, 61, 109],
    base: 89,
    trend: 4,
    jitter: 4,
    sectionOffsets: {
      pre_class: 2,
      first_timer_intro: -11,
      intro: -10,
      class: 8,
      post_workout: 2,
    },
    boosts: [/room control/i, /challenged members/i, /corrected improper form/i],
    penalties: [
      /warm welcome/i,
      /introduced self/i,
      /welcomed first timers/i,
      /detailed workout/i,
      /showed ipad/i,
      /signed waiver/i,
      /tour/i,
      /went over/i,
    ],
    note:
      "Strong on floor once class starts, but the opening sequence still lacks polish and consistency.",
  },
  stable_acceptable: {
    count: 4,
    dateOffsets: [15, 42, 76, 112],
    base: 88,
    trend: 2,
    jitter: 3,
    sectionOffsets: {
      pre_class: 1,
      first_timer_intro: 0,
      intro: 1,
      class: 3,
      post_workout: 1,
    },
    boosts: [/in uniform/i, /warm welcome/i],
    penalties: [/celebrated using specificity/i],
    note:
      "Dependable session delivery with no major red flags, but not yet standout performance.",
  },
  developing_confidence: {
    count: 3,
    dateOffsets: [14, 41, 87],
    base: 82,
    trend: 9,
    jitter: 4,
    sectionOffsets: {
      pre_class: -3,
      first_timer_intro: 1,
      intro: 2,
      class: -5,
      post_workout: 1,
    },
    boosts: [/congratulated members/i, /celebrated class/i],
    penalties: [/room control/i, /corrected improper form/i, /sent class to sled track/i],
    note:
      "Confidence is building, but room command and live coaching reps still need repetition.",
  },
  below_standard_declining: {
    count: 3,
    dateOffsets: [11, 37, 73, 113],
    base: 82,
    trend: -12,
    jitter: 4,
    sectionOffsets: {
      pre_class: -4,
      first_timer_intro: -3,
      intro: -6,
      class: -12,
      post_workout: -8,
    },
    boosts: [],
    penalties: [
      /room control/i,
      /corrected improper form/i,
      /challenged members/i,
      /watched session highlights/i,
      /post workout announcements/i,
    ],
    note:
      "Recent evaluations show slippage in preparation, command, and end-of-class energy.",
  },
  at_risk_low_energy: {
    count: 2,
    dateOffsets: [8, 27, 64],
    base: 60,
    trend: -4,
    jitter: 5,
    sectionOffsets: {
      pre_class: -7,
      first_timer_intro: -8,
      intro: -6,
      class: -12,
      post_workout: -15,
    },
    boosts: [],
    penalties: [
      /congratulated members/i,
      /challenged members/i,
      /celebrated/i,
      /attended to first timers/i,
      /room control/i,
    ],
    note:
      "Energy and engagement are inconsistent enough that the coach now sits in an intervention zone.",
  },
  limited_coverage_promising: {
    count: 2,
    dateOffsets: [28, 92],
    base: 89,
    trend: 4,
    jitter: 3,
    sectionOffsets: {
      pre_class: 2,
      first_timer_intro: 2,
      intro: 1,
      class: 3,
      post_workout: 2,
    },
    boosts: [/welcomed first timers/i, /coached first timers/i],
    penalties: [],
    note:
      "Positive signal so far, but leadership still needs another cycle before calling the profile stable.",
  },
  limited_coverage_due_soon: {
    count: 2,
    dateOffsets: [96, 151],
    base: 84,
    trend: 3,
    jitter: 3,
    sectionOffsets: {
      pre_class: 0,
      first_timer_intro: 1,
      intro: 0,
      class: 2,
      post_workout: 1,
    },
    boosts: [/coached first timers/i],
    penalties: [/post workout announcements/i],
    note:
      "Directional signal is acceptable, but the profile needs a fresh touchpoint to keep confidence high.",
  },
  improving_but_below: {
    count: 4,
    dateOffsets: [10, 32, 67, 124],
    base: 57,
    trend: 10,
    jitter: 4,
    sectionOffsets: {
      pre_class: -8,
      first_timer_intro: -4,
      intro: -5,
      class: -2,
      post_workout: -1,
    },
    boosts: [/challenged members/i, /corrected improper form/i],
    penalties: [/watched session highlights/i, /warm welcome/i],
    note:
      "Coaching quality is moving up, but the operating standard has not been cleared consistently yet.",
  },
  coverage_gap_capable: {
    count: 2,
    dateOffsets: [104, 156],
    base: 71,
    trend: 1,
    jitter: 2,
    sectionOffsets: {
      pre_class: -1,
      first_timer_intro: 0,
      intro: 0,
      class: 1,
      post_workout: 1,
    },
    boosts: [/warm welcome/i, /coached first timers/i],
    penalties: [],
    note:
      "Coach quality looks fundamentally sound, but the evaluation cadence is too thin for a healthy operating picture.",
  },
  preserve_existing_performance_risk: {
    count: 2,
    dateOffsets: [13, 49],
    base: 59,
    trend: 4,
    jitter: 3,
    sectionOffsets: {
      pre_class: -8,
      first_timer_intro: -5,
      intro: -7,
      class: -12,
      post_workout: -13,
    },
    boosts: [],
    penalties: [
      /room control/i,
      /corrected improper form/i,
      /challenged members/i,
      /celebrated/i,
    ],
    note:
      "Recent follow-up confirms the coach is still missing core execution and member engagement standards.",
  },
  preserve_existing_volatile_recovery: {
    count: 6,
    dateOffsets: [6, 17, 31, 48, 79, 132],
    base: 68,
    trend: 22,
    jitter: 5,
    sectionOffsets: {
      pre_class: -6,
      first_timer_intro: -4,
      intro: -4,
      class: 3,
      post_workout: -2,
    },
    boosts: [/room control/i, /corrected improper form/i],
    penalties: [/watched session highlights/i, /post workout announcements/i],
    note:
      "The coach is recovering sharply after an unstable early pattern, but the full body of work is still uneven.",
  },
  preserve_existing_strong: {
    count: 0,
    dateOffsets: [],
    base: 0,
    trend: 0,
    jitter: 0,
    sectionOffsets: {},
    boosts: [],
    penalties: [],
    note:
      "Existing evaluation history already provides strong presentation coverage for this coach.",
  },
  city_center_stable: {
    count: 4,
    dateOffsets: [18, 46, 83, 117],
    base: 78,
    trend: 2,
    jitter: 3,
    sectionOffsets: {
      pre_class: 1,
      first_timer_intro: 1,
      intro: 0,
      class: 1,
      post_workout: 1,
    },
    boosts: [/in uniform/i, /warm welcome/i],
    penalties: [/celebrated using specificity/i, /tour/i],
    note:
      "Operationally steady and generally healthy, but not positioned as the flagship studio in the region.",
  },
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function randomFromList(list, seed) {
  return list[hashString(seed) % list.length];
}

function addDays(baseDate, daysAgo) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() - daysAgo);
  return next;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(seed) {
  const hourOptions = ["05:30", "06:15", "07:00", "09:15", "12:00", "17:30", "18:45"];
  return randomFromList(hourOptions, seed);
}

function buildIsoDateTime(date, time) {
  return `${date}T${time}:00.000Z`;
}

function buildTemplateSnapshot(template) {
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    sections: template.sections.map((section) => ({
      id: section.id,
      title: section.title,
      module_key: section.module_key,
      display_order: section.display_order,
      items: section.items.map((item) => ({
        id: item.id,
        section_id: item.section_id,
        label: item.label,
        description: item.description ?? null,
        input_type: item.input_type,
        min_score: item.min_score ?? null,
        max_score: item.max_score ?? null,
        weight: Number(item.weight ?? 1),
        sort_order: Number(item.sort_order ?? 0),
        is_required: item.is_required !== false,
        is_active: item.is_active !== false,
        options_json: item.options_json ?? null,
        condition: item.condition ?? "always",
      })),
    })),
  };
}

function filterItemByCondition(condition, context) {
  if (!condition || condition === "always") return true;
  if (condition === "lead_only" && context.role !== "lead") return false;
  if (condition === "demo_only" && context.role !== "demo") return false;
  if (condition === "am_only" && context.shift !== "am") return false;
  if (condition === "pm_only" && context.shift !== "pm") return false;
  if (condition === "green_star_only" && !context.greenStar) return false;
  return true;
}

function getItemWeight(item) {
  return Number(item.weight ?? 1);
}

function getItemMaxScore(item) {
  const weight = getItemWeight(item);

  if (item.input_type === "boolean") return 1 * weight;
  if (item.input_type === "score") return Number(item.max_score ?? 5) * weight;
  if (item.input_type === "select") return 1 * weight;
  return 0;
}

function getItemEarnedScore(item, response) {
  if (!response) return 0;
  const weight = getItemWeight(item);

  if (item.input_type === "boolean") {
    return response.response_check === true ? 1 * weight : 0;
  }

  if (item.input_type === "score") {
    return Number(response.response_score ?? 0) * weight;
  }

  if (item.input_type === "select") {
    return Number(response.response_score ?? 0) * weight;
  }

  return 0;
}

function getNormalizedPercent(earned, max) {
  if (max <= 0) return 0;
  return clamp(Math.round((earned / max) * 100));
}

function getOverallTarget(profile, evalIndex) {
  if (profile.count <= 1) return profile.base;
  const progress = evalIndex / (profile.count - 1);
  return profile.base + profile.trend * progress;
}

function getTargetJitter(seed, profile) {
  const amplitude = Number(profile.jitter ?? 0);
  if (!amplitude) return 0;
  const raw = hashString(seed) % (amplitude * 2 + 1);
  return raw - amplitude;
}

function applyLabelBias(label, profile) {
  let delta = 0;

  for (const matcher of profile.boosts ?? []) {
    if (matcher.test(label)) delta += 10;
  }

  for (const matcher of profile.penalties ?? []) {
    if (matcher.test(label)) delta -= 16;
  }

  return delta;
}

function buildResponseForItem({
  item,
  sectionTarget,
  seed,
  profile,
}) {
  const labelTarget = clamp(sectionTarget + applyLabelBias(item.label, profile), 8, 98);

  if (item.input_type === "boolean") {
    const passThreshold = hashString(`${seed}:${item.id}`) % 100;
    const passed = passThreshold < labelTarget;

    return {
      response_check: passed,
      response_score: passed ? 1 : 0,
      response_text: null,
    };
  }

  if (item.input_type === "score") {
    const range = Number(item.max_score ?? 5) - Number(item.min_score ?? 1);
    const normalized = clamp(labelTarget, 0, 100) / 100;
    const rawScore =
      Number(item.min_score ?? 1) + Math.round(normalized * range);
    const bump = (hashString(`${seed}:${item.id}:score`) % 3) - 1;
    const score = Math.max(
      Number(item.min_score ?? 1),
      Math.min(Number(item.max_score ?? 5), rawScore + bump),
    );

    return {
      response_check: null,
      response_score: score,
      response_text: null,
    };
  }

  if (item.input_type === "select") {
    const passed = (hashString(`${seed}:${item.id}:select`) % 100) < labelTarget;

    return {
      response_check: null,
      response_score: passed ? 1 : 0,
      response_text: passed ? "Yes" : "No",
    };
  }

  return {
    response_check: null,
    response_score: null,
    response_text: profile.note,
  };
}

function buildEvaluationScores(templateSections, responsesByItemId, context) {
  const sectionScoreMap = {};
  let totalEarned = 0;
  let totalMax = 0;

  for (const section of templateSections) {
    let sectionEarned = 0;
    let sectionMax = 0;

    for (const item of section.items) {
      if (item.is_active === false) continue;
      if (!filterItemByCondition(item.condition, context)) continue;
      if (item.input_type === "text") continue;

      const response = responsesByItemId[item.id];
      sectionEarned += getItemEarnedScore(item, response);
      sectionMax += getItemMaxScore(item);
    }

    totalEarned += sectionEarned;
    totalMax += sectionMax;
    sectionScoreMap[section.module_key] = getNormalizedPercent(sectionEarned, sectionMax);
  }

  const normalized = getNormalizedPercent(totalEarned, totalMax);
  const performanceLevel =
    normalized >= 90
      ? "elite"
      : normalized >= 78
        ? "strong"
        : normalized >= 65
          ? "needs_improvement"
          : "at_risk";

  return {
    sectionScoreMap,
    finalScore: Math.round(totalEarned * 100) / 100,
    normalized,
    classPerformanceScore: normalized,
    executionScore: 0,
    experienceScore: 0,
    greenStarScore: 0,
    performanceLevel,
  };
}

function buildCoachName(coach) {
  return `${coach.first_name ?? ""} ${coach.last_name ?? ""}`.trim();
}

function getProfileKeyForCoach(studioId, coachIndex) {
  const story = STUDIO_STORIES[studioId];
  if (!story) return "stable_acceptable";
  return story.profiles[coachIndex] ?? story.profiles[story.profiles.length - 1] ?? "stable_acceptable";
}

function buildStudioTemplates(templates, sections, items) {
  const sectionsByTemplateId = new Map();
  const itemsBySectionId = new Map();

  for (const section of sections) {
    const list = sectionsByTemplateId.get(section.template_id) ?? [];
    list.push({
      ...section,
      display_order: Number(section.display_order ?? 0),
      items: [],
    });
    sectionsByTemplateId.set(section.template_id, list);
  }

  for (const item of items) {
    const list = itemsBySectionId.get(item.section_id) ?? [];
    list.push({
      ...item,
      weight: Number(item.weight ?? 1),
      sort_order: Number(item.sort_order ?? 0),
      is_required: item.is_required !== false,
      is_active: item.is_active !== false,
    });
    itemsBySectionId.set(item.section_id, list);
  }

  const templateByStudioId = new Map();

  for (const template of templates) {
    const resolvedSections = (sectionsByTemplateId.get(template.id) ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((section) => ({
        ...section,
        items: (itemsBySectionId.get(section.id) ?? []).sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
      }));

    templateByStudioId.set(template.studio_id, {
      ...template,
      sections: resolvedSections,
    });
  }

  return templateByStudioId;
}

function chunk(array, size) {
  const result = [];

  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }

  return result;
}

async function fetchSeedContext() {
  const [studiosRes, coachesRes, templatesRes] = await Promise.all([
    supabase.from("studios").select("id, name").order("name"),
    supabase
      .from("coaches")
      .select("id, studio_id, first_name, last_name, role_title, hire_date, status")
      .eq("status", "active")
      .order("studio_id")
      .order("first_name"),
    supabase
      .from("evaluation_templates")
      .select("id, studio_id, name, version, is_active, is_default")
      .eq("is_active", true),
  ]);

  if (studiosRes.error) throw studiosRes.error;
  if (coachesRes.error) throw coachesRes.error;
  if (templatesRes.error) throw templatesRes.error;

  const templateIds = (templatesRes.data ?? []).map((template) => template.id);

  const [sectionsRes, itemsRes] = await Promise.all([
    supabase
      .from("evaluation_template_sections")
      .select("id, template_id, title, module_key, display_order")
      .in("template_id", templateIds)
      .order("display_order"),
    supabase
      .from("evaluation_template_items")
      .select(
        "id, section_id, label, description, input_type, min_score, max_score, weight, sort_order, is_required, is_active, condition, options_json",
      )
      .order("sort_order"),
  ]);

  if (sectionsRes.error) throw sectionsRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const sectionIds = new Set((sectionsRes.data ?? []).map((section) => section.id));
  const scopedItems = (itemsRes.data ?? []).filter((item) => sectionIds.has(item.section_id));

  return {
    studios: studiosRes.data ?? [],
    coaches: coachesRes.data ?? [],
    templateByStudioId: buildStudioTemplates(
      templatesRes.data ?? [],
      sectionsRes.data ?? [],
      scopedItems,
    ),
  };
}

async function clearPreviousSeed() {
  const { data: seedEvaluations, error: selectError } = await supabase
    .from("evaluations")
    .select("id")
    .like("id", "seed_eval_%");

  if (selectError) throw selectError;

  const seedEvaluationIds = (seedEvaluations ?? []).map((item) => item.id);

  if (seedEvaluationIds.length > 0) {
    const { error: responseDeleteError } = await supabase
      .from("evaluation_responses")
      .delete()
      .in("evaluation_id", seedEvaluationIds);

    if (responseDeleteError) throw responseDeleteError;

    const { error: evaluationDeleteError } = await supabase
      .from("evaluations")
      .delete()
      .in("id", seedEvaluationIds);

    if (evaluationDeleteError) throw evaluationDeleteError;
  }
}

function buildSeedPayloads(context) {
  const evaluations = [];
  const responses = [];

  const coachesByStudio = new Map();
  for (const coach of context.coaches) {
    const list = coachesByStudio.get(coach.studio_id) ?? [];
    list.push(coach);
    coachesByStudio.set(coach.studio_id, list);
  }

  for (const [studioId, coaches] of coachesByStudio.entries()) {
    const template = context.templateByStudioId.get(studioId);
    if (!template) {
      throw new Error(`Missing active template for studio ${studioId}`);
    }

    const sortedCoaches = [...coaches].sort((a, b) =>
      buildCoachName(a).localeCompare(buildCoachName(b)),
    );

    sortedCoaches.forEach((coach, coachIndex) => {
      const profileKey = getProfileKeyForCoach(studioId, coachIndex);
      const profile = PROFILE_LIBRARY[profileKey];

      if (!profile) {
        throw new Error(`Missing profile definition for ${profileKey}`);
      }

      if (profile.count <= 0) return;

      const templateSnapshot = buildTemplateSnapshot(template);

      for (let evalIndex = 0; evalIndex < profile.count; evalIndex += 1) {
        const evalSeed = `${studioId}:${coach.id}:${profileKey}:${evalIndex}`;
        const offsetBase = profile.dateOffsets[evalIndex] ?? profile.dateOffsets[profile.dateOffsets.length - 1] ?? 21;
        const offsetJitter = (hashString(`${evalSeed}:date`) % 7) - 3;
        const classDate = formatDate(addDays(BASE_DATE, Math.max(1, offsetBase + offsetJitter)));
        const role =
          coach.role_title?.toLowerCase().includes("lead")
            ? "lead"
            : evalIndex % 4 === 0
              ? "demo"
              : "lead";
        const shift = SHIFT_TYPES[(hashString(`${evalSeed}:shift`) % SHIFT_TYPES.length)];
        const greenStar = hashString(`${evalSeed}:green`) % 100 < 45;
        const contextForEval = {
          role,
          shift,
          greenStar,
        };

        const responsesByItemId = {};

        for (const section of template.sections) {
          const sectionBase =
            getOverallTarget(profile, evalIndex) +
            Number(profile.sectionOffsets?.[section.module_key] ?? 0) +
            getTargetJitter(`${evalSeed}:${section.module_key}`, profile);

          for (const item of section.items) {
            if (item.is_active === false) continue;
            if (!filterItemByCondition(item.condition, contextForEval)) continue;

            responsesByItemId[item.id] = buildResponseForItem({
              item,
              sectionTarget: sectionBase,
              seed: evalSeed,
              profile,
            });
          }
        }

        const scorePayload = buildEvaluationScores(
          template.sections,
          responsesByItemId,
          contextForEval,
        );

        const evaluationId = `seed_eval_${studioId}_${coach.id}_${evalIndex + 1}`;
        const evaluatorPool = EVALUATOR_POOLS[studioId] ?? ["Regional QA Lead"];
        const evaluatorName = randomFromList(evaluatorPool, `${evalSeed}:evaluator`);
        const classType = randomFromList(CLASS_TYPES, `${evalSeed}:classType`);
        const classSize = 18 + (hashString(`${evalSeed}:classSize`) % 22);
        const classTime = formatTime(evalSeed);
        const classDateTime = buildIsoDateTime(classDate, classTime);
        const notesGeneral = `${profile.note} Seeded for presentation coverage.`;

        evaluations.push({
          id: evaluationId,
          studio_id: studioId,
          coach_id: coach.id,
          evaluator_name: evaluatorName,
          class_date: classDate,
          class_time: classTime,
          class_name: `${classType} Session`,
          class_type: classType,
          class_size: classSize,
          pre_class_score: scorePayload.sectionScoreMap.pre_class ?? 0,
          first_timer_intro_score:
            scorePayload.sectionScoreMap.first_timer_intro ?? 0,
          intro_score: scorePayload.sectionScoreMap.intro ?? 0,
          class_score: scorePayload.sectionScoreMap.class ?? 0,
          post_workout_score: scorePayload.sectionScoreMap.post_workout ?? 0,
          class_performance_score: scorePayload.classPerformanceScore,
          execution_score: scorePayload.executionScore,
          experience_score: scorePayload.experienceScore,
          green_star_score: scorePayload.greenStarScore,
          performance_level: scorePayload.performanceLevel,
          final_score: scorePayload.finalScore,
          normalized_score_percent: scorePayload.normalized,
          notes_general: notesGeneral,
          created_at: classDateTime,
          coach_role: role,
          shift_type: shift,
          green_star_present: greenStar,
          class_datetime: classDateTime,
          template_id: template.id,
          template_version: template.version,
          responses_json: Object.fromEntries(
            Object.entries(responsesByItemId).map(([itemId, response]) => [
              itemId,
              response,
            ]),
          ),
          template_snapshot: templateSnapshot,
        });

        for (const [itemId, response] of Object.entries(responsesByItemId)) {
          responses.push({
            id: `seed_resp_${evaluationId}_${itemId}`,
            evaluation_id: evaluationId,
            template_item_id: itemId,
            response_check: response.response_check ?? null,
            response_score: response.response_score ?? null,
            response_text: response.response_text ?? null,
          });
        }
      }
    });
  }

  return { evaluations, responses };
}

function computeStudioRollup(studios, coaches, evaluations) {
  const evaluationsByCoach = new Map();

  for (const evaluation of evaluations) {
    const list = evaluationsByCoach.get(evaluation.coach_id) ?? [];
    list.push(evaluation);
    evaluationsByCoach.set(evaluation.coach_id, list);
  }

  return studios.map((studio) => {
    const studioCoaches = coaches.filter((coach) => coach.studio_id === studio.id);
    const studioCoachIds = new Set(studioCoaches.map((coach) => coach.id));
    const studioEvaluations = evaluations.filter((evaluation) =>
      studioCoachIds.has(evaluation.coach_id),
    );

    let noEvaluationCount = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;
    let onTrackCount = 0;

    for (const coach of studioCoaches) {
      const coachEvals = (evaluationsByCoach.get(coach.id) ?? [])
        .slice()
        .sort((a, b) => String(b.class_date).localeCompare(String(a.class_date)));

      if (coachEvals.length === 0) {
        noEvaluationCount += 1;
        continue;
      }

      const latestDate = new Date(coachEvals[0].class_date);
      const diffDays =
        (BASE_DATE.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays > 120) overdueCount += 1;
      else if (diffDays > 90) dueSoonCount += 1;
      else onTrackCount += 1;
    }

    const averageScore =
      studioEvaluations.length > 0
        ? Math.round(
            studioEvaluations.reduce(
              (sum, evaluation) => sum + Number(evaluation.normalized_score_percent ?? 0),
              0,
            ) / studioEvaluations.length,
          )
        : 0;

    return {
      studio_id: studio.id,
      studio_name: studio.name,
      narrative: STUDIO_STORIES[studio.id]?.label ?? "Custom",
      coaches_count: studioCoaches.length,
      total_evaluations: studioEvaluations.length,
      average_score: averageScore,
      no_evaluation_count: noEvaluationCount,
      overdue_count: overdueCount,
      due_soon_count: dueSoonCount,
      on_track_count: onTrackCount,
    };
  });
}

async function run() {
  console.log("Inspecting live data model...");
  const context = await fetchSeedContext();

  console.log("Clearing previous presentation seed...");
  await clearPreviousSeed();

  console.log("Building seeded evaluations...");
  const payload = buildSeedPayloads(context);

  for (const batch of chunk(payload.evaluations, 50)) {
    const { error } = await supabase.from("evaluations").insert(batch);
    if (error) throw error;
  }

  for (const batch of chunk(payload.responses, 250)) {
    const { error } = await supabase.from("evaluation_responses").insert(batch);
    if (error) throw error;
  }

  const { data: allEvaluations, error: evaluationsError } = await supabase
    .from("evaluations")
    .select("id, studio_id, coach_id, class_date, normalized_score_percent");

  if (evaluationsError) throw evaluationsError;

  const rollup = computeStudioRollup(
    context.studios,
    context.coaches,
    allEvaluations ?? [],
  ).sort((a, b) => b.average_score - a.average_score);

  console.log("");
  console.log("Presentation seed complete.");
  console.log(
    JSON.stringify(
      {
        inserted_seed_evaluations: payload.evaluations.length,
        inserted_seed_responses: payload.responses.length,
        studio_rollup: rollup,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error("Presentation seed failed:", error);
  process.exit(1);
});
