import { CoachOnboarding } from "@/lib/types";

export const createOnboardingTemplate = (): CoachOnboarding => ({
  status: "not_started",
  progress: 0,
  stages: [
    {
      key: "admin_setup",
      title: "Administrative Setup",
      tasks: [
        {
          id: "gusto_invitation_sent",
          label: "Gusto invitation sent",
          completed: false,
        },
        {
          id: "gusto_onboarding_completed",
          label: "Gusto onboarding completed",
          completed: false,
        },
        {
          id: "payroll_setup_confirmed",
          label: "Payroll setup confirmed",
          completed: false,
        },
        {
          id: "contact_information_verified",
          label: "Contact information verified",
          completed: false,
        },
      ],
    },
    {
      key: "studio_introduction",
      title: "Studio Introduction",
      tasks: [
        {
          id: "studio_tour_completed",
          label: "Studio tour completed",
          completed: false,
        },
        {
          id: "introduced_to_coaching_team",
          label: "Introduced to coaching team",
          completed: false,
        },
        {
          id: "introduced_to_studio_management",
          label: "Introduced to studio management",
          completed: false,
        },
        {
          id: "reviewed_studio_culture_and_expectations",
          label: "Reviewed studio culture and expectations",
          completed: false,
        },
      ],
    },
    {
      key: "coaching_standards_training",
      title: "Coaching Standards Training",
      tasks: [
        {
          id: "reviewed_f45_workout_structure",
          label: "Reviewed F45 workout structure",
          completed: false,
        },
        {
          id: "reviewed_class_flow_and_timing",
          label: "Reviewed class flow and timing",
          completed: false,
        },
        {
          id: "reviewed_coaching_cues",
          label: "Reviewed coaching cues",
          completed: false,
        },
        {
          id: "reviewed_safety_and_injury_prevention",
          label: "Reviewed safety and injury prevention",
          completed: false,
        },
        {
          id: "reviewed_member_engagement_expectations",
          label: "Reviewed member engagement expectations",
          completed: false,
        },
      ],
    },
    {
      key: "shadow_coaching",
      title: "Shadow Coaching",
      tasks: [
        {
          id: "observed_at_least_2_classes",
          label: "Observed at least 2 classes",
          completed: false,
        },
        {
          id: "observed_warm_up_coaching",
          label: "Observed warm-up coaching",
          completed: false,
        },
        {
          id: "observed_class_flow",
          label: "Observed class flow",
          completed: false,
        },
        {
          id: "observed_member_interaction",
          label: "Observed member interaction",
          completed: false,
        },
      ],
    },
    {
      key: "practice_coaching",
      title: "Practice Coaching",
      tasks: [
        {
          id: "assisted_coaching_in_class",
          label: "Assisted coaching in class",
          completed: false,
        },
        {
          id: "practiced_exercise_demonstrations",
          label: "Practiced exercise demonstrations",
          completed: false,
        },
        {
          id: "practiced_coaching_cues",
          label: "Practiced coaching cues",
          completed: false,
        },
        {
          id: "practiced_member_corrections",
          label: "Practiced member corrections",
          completed: false,
        },
      ],
    },
    {
      key: "final_approval",
      title: "Final Approval",
      tasks: [
        {
          id: "manager_final_evaluation_completed",
          label: "Manager final evaluation completed",
          completed: false,
        },
        {
          id: "coach_approved_to_lead_class",
          label: "Coach approved to lead class",
          completed: false,
        },
        {
          id: "added_to_studio_schedule",
          label: "Added to studio schedule",
          completed: false,
        },
        {
          id: "first_shift_confirmed",
          label: "First shift confirmed",
          completed: false,
        },
      ],
    },
  ],
});