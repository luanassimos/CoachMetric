// Raw data store — separated from logic
// In the future, this will be replaced by database queries

import type { Studio, Coach, Evaluation, DevelopmentPlan, TrainingSession, TrainingAttendance } from "@/lib/types";

export const studios: Studio[] = [
  { id: "nb", name: "North Beach", city: "San Francisco", state: "CA" },
  { id: "bg", name: "Burlingame", city: "Burlingame", state: "CA" },
  { id: "cc", name: "City Center", city: "San Francisco", state: "CA" },
  { id: "tb", name: "Transbay", city: "San Francisco", state: "CA" },
];

export const coaches: Coach[] = [
  { id: "c1", studio_id: "nb", first_name: "Sarah", last_name: "Chen", email: "sarah@f45.com", role_title: "Lead Trainer", hire_date: "2024-05-01", status: "active" },
  { id: "c2", studio_id: "nb", first_name: "Marcus", last_name: "Williams", email: "marcus@f45.com", role_title: "Trainer", hire_date: "2024-06-15", status: "active" },
  { id: "c3", studio_id: "cc", first_name: "Emily", last_name: "Rodriguez", email: "emily@f45.com", role_title: "Trainer", hire_date: "2024-07-10", status: "active" },
  { id: "c4", studio_id: "tb", first_name: "Jake", last_name: "Thompson", email: "jake@f45.com", role_title: "Lead Trainer", hire_date: "2024-04-20", status: "active" },
  { id: "c5", studio_id: "bg", first_name: "Lisa", last_name: "Park", email: "lisa@f45.com", role_title: "Trainer", hire_date: "2024-08-01", status: "active" },
  { id: "c6", studio_id: "nb", first_name: "David", last_name: "Kim", email: "david@f45.com", role_title: "Trainer", hire_date: "2024-09-12", status: "active" },
];

export const evaluations: Evaluation[] = [
  { id: "e1", coach_id: "c1", evaluator_name: "Head Coach Mike", class_date: "2025-03-10", class_time: "06:00", class_type: "Athletica", class_name: "Morning Athletica", class_size: 28, pre_class_score: 7, first_timer_intro_score: 8, intro_score: 16, class_score: 52, post_workout_score: 6, final_score: 89, normalized_score_percent: 92, notes_general: "Excellent energy and form corrections.", created_at: "2025-03-10T08:00:00Z" },
  { id: "e2", coach_id: "c1", evaluator_name: "Head Coach Mike", class_date: "2025-02-15", class_time: "07:00", class_type: "Romans", class_name: "Morning Romans", class_size: 24, pre_class_score: 6, first_timer_intro_score: 7, intro_score: 14, class_score: 48, post_workout_score: 5, final_score: 80, normalized_score_percent: 83, notes_general: "Good session, needs more macro coaching.", created_at: "2025-02-15T09:00:00Z" },
  { id: "e3", coach_id: "c2", evaluator_name: "Head Coach Mike", class_date: "2025-03-08", class_time: "09:00", class_type: "Athletica", class_name: "Morning Athletica", class_size: 22, pre_class_score: 5, first_timer_intro_score: 6, intro_score: 12, class_score: 38, post_workout_score: 4, final_score: 65, normalized_score_percent: 67, notes_general: "Needs improvement on room scanning and micro coaching.", created_at: "2025-03-08T11:00:00Z" },
  { id: "e4", coach_id: "c2", evaluator_name: "Head Coach Mike", class_date: "2025-02-20", class_time: "06:00", class_type: "Hollywood", class_name: "Evening Hollywood", class_size: 30, pre_class_score: 4, first_timer_intro_score: 5, intro_score: 10, class_score: 35, post_workout_score: 3, final_score: 57, normalized_score_percent: 59, notes_general: "Significant gaps in pre-class prep and coaching engagement.", created_at: "2025-02-20T08:00:00Z" },
  { id: "e5", coach_id: "c3", evaluator_name: "Head Coach Mike", class_date: "2025-03-12", class_time: "05:30", class_type: "Athletica", class_name: "Early Athletica", class_size: 26, pre_class_score: 8, first_timer_intro_score: 9, intro_score: 18, class_score: 55, post_workout_score: 7, final_score: 97, normalized_score_percent: 96, notes_general: "Outstanding across all categories.", created_at: "2025-03-12T07:30:00Z" },
  { id: "e6", coach_id: "c4", evaluator_name: "District Manager Ana", class_date: "2025-03-05", class_time: "07:00", class_type: "Romans", class_name: "Morning Romans", class_size: 20, pre_class_score: 6, first_timer_intro_score: 7, intro_score: 15, class_score: 45, post_workout_score: 5, final_score: 78, normalized_score_percent: 76, notes_general: "Solid performance, room for growth in celebrations.", created_at: "2025-03-05T09:00:00Z" },
  { id: "e7", coach_id: "c5", evaluator_name: "District Manager Ana", class_date: "2025-03-01", class_time: "06:00", class_type: "Athletica", class_name: "Morning Athletica", class_size: 18, pre_class_score: 7, first_timer_intro_score: 8, intro_score: 16, class_score: 49, post_workout_score: 6, final_score: 86, normalized_score_percent: 85, notes_general: "Strong showing for a newer coach.", created_at: "2025-03-01T08:00:00Z" },
  { id: "e8", coach_id: "c6", evaluator_name: "Head Coach Mike", class_date: "2025-03-11", class_time: "09:00", class_type: "Hollywood", class_name: "Morning Hollywood", class_size: 25, pre_class_score: 5, first_timer_intro_score: 6, intro_score: 13, class_score: 40, post_workout_score: 4, final_score: 68, normalized_score_percent: 65, notes_general: "New coach — showing promise but needs more confidence.", created_at: "2025-03-11T11:00:00Z" },
];

export const developmentPlans: DevelopmentPlan[] = [
  {
    id: "dp1", coach_id: "c2", summary: "Improve coaching engagement and pre-class preparation", status: "active", start_date: "2025-03-01", end_date: "2025-06-01",
    goals: [
      { id: "g1", development_plan_id: "dp1", goal_title: "Increase micro-coaching frequency", goal_description: "Aim for at least 12 micro-coaching moments per class", status: "in_progress", due_date: "2025-04-15" },
      { id: "g2", development_plan_id: "dp1", goal_title: "Consistent pre-class checklist", goal_description: "Complete all 8 pre-class items for 10 consecutive classes", status: "not_started", due_date: "2025-05-01" },
    ],
  },
  {
    id: "dp2", coach_id: "c6", summary: "Build confidence and class control", status: "active", start_date: "2025-03-15", end_date: "2025-06-15",
    goals: [
      { id: "g3", development_plan_id: "dp2", goal_title: "Shadow senior trainers", goal_description: "Shadow 5 classes with Sarah or Emily", status: "in_progress", due_date: "2025-04-30" },
      { id: "g4", development_plan_id: "dp2", goal_title: "Room control drills", goal_description: "Practice room scanning patterns during off-peak classes", status: "not_started", due_date: "2025-05-15" },
    ],
  },
];

export const trainingSessions: TrainingSession[] = [
  { id: "ts1", studio_id: "s1", title: "Four Pillars Workshop", topic: "Four Pillars", session_date: "2025-03-05", facilitator_name: "Head Coach Mike" },
  { id: "ts2", studio_id: "s1", title: "Green Star Welcome Process", topic: "Green Star Welcome Process", session_date: "2025-03-12", facilitator_name: "Head Coach Mike" },
  { id: "ts3", studio_id: "s1", title: "Rebooking Strategies", topic: "Rebooking", session_date: "2025-02-28", facilitator_name: "Emily Rodriguez" },
];

export const trainingAttendance: TrainingAttendance[] = [
  { id: "ta1", training_session_id: "ts1", coach_id: "c1", attended: true, notes: "" },
  { id: "ta2", training_session_id: "ts1", coach_id: "c2", attended: true, notes: "" },
  { id: "ta3", training_session_id: "ts1", coach_id: "c3", attended: true, notes: "" },
  { id: "ta4", training_session_id: "ts1", coach_id: "c6", attended: false, notes: "Sick" },
  { id: "ta5", training_session_id: "ts2", coach_id: "c1", attended: true, notes: "" },
  { id: "ta6", training_session_id: "ts2", coach_id: "c2", attended: false, notes: "Schedule conflict" },
  { id: "ta7", training_session_id: "ts2", coach_id: "c3", attended: true, notes: "" },
  { id: "ta8", training_session_id: "ts2", coach_id: "c6", attended: true, notes: "" },
];
