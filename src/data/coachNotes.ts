import { CoachNote } from "../lib/types";

export const coachNotes: CoachNote[] = [
  {
    id: "1",
    coach_id: "3",
    date: "2025-03-08",
    type: "attendance",
    severity: "medium",
    title: "Arrived late to class prep",
    description:
      "Coach arrived less than 15 minutes before class and skipped full station walkthrough.",
    created_by: "Head Coach Mike",
  },
  {
    id: "2",
    coach_id: "3",
    date: "2025-03-10",
    type: "positive",
    severity: "low",
    title: "Great class energy",
    description:
      "Strong room presence and great motivation throughout the full session.",
    created_by: "Head Coach Mike",
  },
  {
    id: "3",
    coach_id: "2",
    date: "2025-03-11",
    type: "member_feedback",
    severity: "medium",
    title: "Member needed more guidance",
    description:
      "A member mentioned they were unsure about station flow and wanted more explanation.",
    created_by: "Emily Rodriguez",
  },
  {
    id: "4",
    coach_id: "1",
    date: "2025-03-12",
    type: "positive",
    severity: "low",
    title: "Excellent first timer handling",
    description:
      "Coach welcomed first timer well, explained the class clearly, and helped with rebooking.",
    created_by: "Head Coach Mike",
  },
];