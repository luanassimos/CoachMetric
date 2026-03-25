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
