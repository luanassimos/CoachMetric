// Centralized type definitions for the Coach Performance Manager

export interface Studio {
  id: string;
  name: string;
  city: string;
  state: string;
}

export interface Coach {
  id: string;
  studio_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_title: string;
  hire_date: string;
  status: "active" | "inactive";
  onboarding?: CoachOnboarding;
}
export type OnboardingStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export interface OnboardingTask {
  id: string;
  label: string;
  completed: boolean;
  completed_at?: string;
}

export interface OnboardingStage {
  key: string;
  title: string;
  tasks: OnboardingTask[];
}

export interface CoachOnboarding {
  status: "not_started" | "in_progress" | "completed";
  progress: number;
  stages: {
    key: string;
    title: string;
    tasks: {
      id: string;
      label: string;
      completed: boolean;
    }[];
  }[];
}
export interface Evaluation {
  id: string;
  coach_id: string;
  evaluator_name: string;
  class_date: string;
  class_time: string;
  class_name: string;
  class_type: string;
  class_size: number;
  pre_class_score: number;
  first_timer_intro_score: number;
  intro_score: number;
  class_score: number;
  post_workout_score: number;
  final_score: number;
  normalized_score_percent: number;
  notes_general: string;
  created_at: string;
  responses?: EvaluationResponse[];
}

export interface EvaluationResponse {
  id: string;
  evaluation_id: string;
  section_code: string;
  item_code: string;
  item_label: string;
  response_value: number;
  awarded_points: number;
  comment: string;
}

export interface DevelopmentPlan {
  id: string;
  coach_id: string;
  summary: string;
  status: "active" | "completed" | "on_hold";
  start_date: string;
  end_date: string;
  goals: DevelopmentGoal[];
}

export interface DevelopmentGoal {
  id: string;
  development_plan_id: string;
  goal_title: string;
  goal_description: string;
  status: "not_started" | "in_progress" | "completed";
  due_date: string;
}

export interface TrainingSession {
  id: string;
  studio_id: string;
  title: string;
  topic: string;
  session_date: string;
  facilitator_name: string;
}

export interface TrainingAttendance {
  id: string;
  training_session_id: string;
  coach_id: string;
  attended: boolean;
  notes: string;
}

// ── Computed metrics for a coach ──
export interface CoachMetrics {
  coach_id: string;
  average_score: number | null;
  last_3_average: number | null;
  last_10_average: number | null;
  evaluation_count: number;
  trend: TrendDirection;
  latest_evaluation: Evaluation | undefined;
  score_history: ScoreHistoryPoint[];
}

export type TrendDirection = "improving" | "stable" | "declining";

export interface ScoreHistoryPoint {
  date: string;
  score: number;
  class_type: string;
  evaluation_id: string;
}

// ── Insights ──
export type InsightType =
  | "repeated_low_section"
  | "declining_activity"
  | "high_consistency"
  | "rapid_improvement"
  | "missing_evaluations"
  | "training_gap";

export type InsightSeverity = "info" | "warning" | "critical";

export interface CoachInsight {
  id: string;
  coach_id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  created_at: string;
}

// ── Dashboard data ──
export interface DashboardData {
  team_average_score: number;
  top_performing_coaches: { coach: Coach; avg: number }[];
  coaches_needing_attention: { coach: Coach; avg: number; trend: TrendDirection }[];
  recent_evaluations: (Evaluation & { coach_name: string })[];
  active_dev_plans_count: number;
  evaluations_this_week: number;
  team_attributes: CoachAttributes;

  total_active_coaches: number;

  high_risk_count: number;
  moderate_risk_count: number;
  low_risk_count: number;

  declining_coaches: { coach: Coach; avg: number }[];
  improving_coaches: { coach: Coach; avg: number }[];

  performance_band_counts: {
    exceptional: number;
    strong: number;
    on_track: number;
    needs_attention: number;
    critical: number;
  };

  section_averages: {
    pre_class: number;
    first_timer_intro: number;
    intro: number;
    class: number;
    post_workout: number;
  };

  notes_by_type: Record<string, number>;
}

// ── Performance band ──
export interface PerformanceBand {
  label: string;
  className: string;
  minScore: number;
}
// ── Coach notes / timeline ──
export type CoachNoteType =
  | "performance"
  | "attendance"
  | "behavior"
  | "conflict"
  | "positive"
  | "member_feedback"
  | "operational";

export type CoachNoteSeverity = "low" | "medium" | "high";

export interface CoachNote {
  id: string;
  coach_id: string;
  date: string;
  type: CoachNoteType;
  severity: CoachNoteSeverity;
  title: string;
  description: string;
  created_by: string;
}
export interface CoachAttributes {
  presence: number
  coaching: number
  engagement: number
  knowledge: number
  professionalism: number
  retention: number
  overall: number
}
export type UserRole =
  | "admin"
  | "district_manager"
  | "head_coach"
  | "coach";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
}

export interface UserStudioAccess {
  id: string;
  user_id: string;
  studio_id: string;
  access_level: "manager" | "viewer" | "coach";
  is_primary: boolean;
}
export type EvaluationInputType =
  | "score"
  | "select"
  | "boolean"
  | "text";

export interface EvaluationTemplate {
  id: string;
  studio_id: string; // IMPORTANTE: string (não uuid)
  name: string;
  description?: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  sections?: EvaluationTemplateSection[];
}

export interface EvaluationTemplateSection {
  id: string;
  template_id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items?: EvaluationTemplateItem[];
}

export interface EvaluationTemplateItemOption {
  label: string;
  value: string | number | boolean;
  score?: number;
}

export interface EvaluationTemplateItem {
  id: string;
  section_id: string;
  label: string;
  description?: string | null;
  input_type: EvaluationInputType;
  min_score?: number | null;
  max_score?: number | null;
  weight: number;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
  options_json?: EvaluationTemplateItemOption[] | null;
  created_at: string;
  updated_at: string;
}