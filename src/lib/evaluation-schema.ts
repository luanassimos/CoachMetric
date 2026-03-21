// Evaluation form structure and scoring

export type ItemType = "boolean" | "scale" | "options";

export interface EvalItem {
  code: string;
  label: string;
  type: ItemType;
  min?: number;
  max?: number;
  options?: number[]; // for custom option sets
}

export interface EvalSection {
  code: string;
  title: string;
  items: EvalItem[];
}

export const evaluationSections: EvalSection[] = [
  {
    code: "pre_class",
    title: "Pre-Class",
    items: [
      { code: "pc1", label: "Arrived 15 mins early", type: "boolean" },
      { code: "pc2", label: "Music playing in background", type: "boolean" },
      { code: "pc3", label: "AC and Fan On", type: "boolean" },
      { code: "pc4", label: "In uniform", type: "boolean" },
      { code: "pc5", label: "Watched Session Highlights before arrival", type: "boolean" },
      { code: "pc6", label: "Walked through each station with co-trainer", type: "boolean" },
      { code: "pc7", label: "Free of phone", type: "boolean" },
      { code: "pc8", label: "Standing up", type: "boolean" },
    ],
  },
  {
    code: "first_timer_intro",
    title: "First Timer Intro",
    items: [
      { code: "ft1", label: "Showed iPad Check-In Process", type: "boolean" },
      { code: "ft2", label: "Signed Waiver", type: "boolean" },
      { code: "ft3", label: "Gave tour to bathrooms, fountain, cubbies", type: "boolean" },
      { code: "ft4", label: "Went over station markers", type: "boolean" },
      { code: "ft5", label: "Went over TVs", type: "boolean" },
      { code: "ft6", label: "Discussed weights", type: "boolean" },
      { code: "ft7", label: "Gym wipes and silver bins", type: "boolean" },
      { code: "ft8", label: "Injuries or restrictions", type: "boolean" },
      { code: "ft9", label: "Toured in proper order", type: "boolean" },
    ],
  },
  {
    code: "intro",
    title: "Intro",
    items: [
      { code: "in1", label: "Sent class to sled track to begin", type: "boolean" },
      { code: "in2", label: "Warm welcome with studio name", type: "boolean" },
      { code: "in3", label: "Introduced self and co-trainer", type: "boolean" },
      { code: "in4", label: "Welcomed first timers", type: "boolean" },
      { code: "in5", label: "Detailed workout and style of class", type: "boolean" },
      { code: "in6", label: "Proper pods, work, rest, sets, laps", type: "boolean" },
      { code: "in7", label: "Set workout goal for the class", type: "boolean" },
      { code: "in8", label: "Stayed on time with TVs", type: "boolean" },
      { code: "in9", label: "Gave members station numbers", type: "boolean" },
      { code: "in10", label: "Adequately narrated exercise demonstrations", type: "scale", min: 1, max: 5 },
      { code: "in11", label: "Provided options for complex exercises", type: "scale", min: 1, max: 5 },
    ],
  },
  {
    code: "class",
    title: "Class",
    items: [
      { code: "cl1", label: "Room Control", type: "scale", min: 1, max: 5 },
      { code: "cl2", label: "Corrected improper form", type: "scale", min: 1, max: 5 },
      { code: "cl3", label: "Congratulated members", type: "scale", min: 1, max: 5 },
      { code: "cl4", label: "Challenged members", type: "scale", min: 1, max: 5 },
      { code: "cl5", label: "Coached first timers", type: "options", options: [0, 2, 4, 6] },
      { code: "cl6", label: "Micros (at least 10 seconds)", type: "options", options: [0, 3, 6, 9, 12, 15, 20] },
      { code: "cl7", label: "Macros (must set goal)", type: "options", options: [0, 2, 4, 6, 8, 10] },
      { code: "cl8", label: "Coached everyone in class", type: "options", options: [0, 5, 10] },
      { code: "cl9", label: "Constantly scanned and walked room", type: "scale", min: 1, max: 5 },
      { code: "cl10", label: "Coached members through set", type: "scale", min: 1, max: 5 },
      { code: "cl11", label: "Music selection didn't cut out", type: "options", options: [0, 2] },
      { code: "cl12", label: "How often coach did nothing", type: "options", options: [0, -3, -6, -10] },
    ],
  },
  {
    code: "post_workout",
    title: "Post Workout",
    items: [
      { code: "pw1", label: "Celebrated class", type: "boolean" },
      { code: "pw2", label: "Celebrated first timers", type: "boolean" },
      { code: "pw3", label: "Post workout announcements", type: "boolean" },
      { code: "pw4", label: "Attended to first timers", type: "boolean" },
      { code: "pw5", label: "Congratulated using specificity", type: "boolean" },
      { code: "pw6", label: "Asked about second class booking", type: "boolean" },
      { code: "pw7", label: "Provide 1 health or nutrition tip", type: "boolean" },
    ],
  },
];

export function getMaxScoreForItem(item: EvalItem): number {
  if (item.type === "boolean") return 1;
  if (item.type === "scale") return item.max || 5;
  if (item.type === "options") return Math.max(...(item.options || [0]));
  return 0;
}

export function getSectionMaxScore(section: EvalSection): number {
  return section.items.reduce((sum, item) => sum + getMaxScoreForItem(item), 0);
}

export function getTotalMaxScore(): number {
  return evaluationSections.reduce((sum, section) => sum + getSectionMaxScore(section), 0);
}
