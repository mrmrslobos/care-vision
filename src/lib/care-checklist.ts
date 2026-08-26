import type { CareChecklistItem } from "@/types/care";

/**
 * Stroke-recovery and general elder-care items families commonly watch during visits.
 * Tune this list to your mother-in-law's care plan with her clinicians.
 */
export const CARE_CHECKLIST: CareChecklistItem[] = [
  {
    id: "room-clean",
    category: "environment",
    label: "Room is clean and uncluttered",
    description: "Trash removed, surfaces wiped, no strong odors.",
    photoHint: "Wide shot of the room and bedside area.",
  },
  {
    id: "call-button",
    category: "safety",
    label: "Call button / alert device within reach",
    description: "She can summon help without straining or falling.",
    photoHint: "Call cord or pendant next to her hand.",
  },
  {
    id: "fall-hazards",
    category: "safety",
    label: "Fall hazards addressed",
    description: "Loose cords, wet floors, unstable furniture, or blocked paths cleared.",
    photoHint: "Floor path from bed to bathroom or chair.",
  },
  {
    id: "hydration",
    category: "nutrition",
    label: "Water within reach and cups labeled if needed",
    description: "Visible water or fluids; straw or adaptive cup if required.",
    photoHint: "Nightstand with cup and any meal tray.",
  },
  {
    id: "meals",
    category: "nutrition",
    label: "Meals look appropriate and recent",
    description: "Food present, not spoiled; diet restrictions respected if known.",
    photoHint: "Meal tray, kitchen area, or snack station.",
  },
  {
    id: "meds-visible",
    category: "medication",
    label: "Medication setup looks organized",
    description: "Pill organizer, MAR sheet, or pharmacy labels visible and current.",
    photoHint: "Medication organizer or MAR without showing full personal identifiers.",
  },
  {
    id: "skin-check",
    category: "skin",
    label: "Skin looks cared for (no obvious redness or wounds)",
    description: "Pressure areas, heels, and elbows checked if she is bed-bound or limited mobility.",
    photoHint: "Only photograph areas she and staff agree are appropriate to document.",
  },
  {
    id: "mobility-aids",
    category: "mobility",
    label: "Walker, wheelchair, or gait belt available and positioned well",
    description: "Equipment within reach; brakes locked when parked.",
    photoHint: "Mobility equipment placement near bed or chair.",
  },
  {
    id: "hygiene",
    category: "hygiene",
    label: "Personal hygiene appears maintained",
    description: "Clean clothing, hair brushed, oral care supplies available.",
    photoHint: "General appearance from a respectful distance.",
  },
  {
    id: "engagement",
    category: "engagement",
    label: "She was engaged or appropriately resting",
    description: "Alertness, speech, or calm rest — note anything unusual for her baseline.",
  },
  {
    id: "therapy-notes",
    category: "mobility",
    label: "PT/OT exercises or homework visible",
    description: "Exercise sheet, ankle pumps reminder, or therapy schedule posted.",
    photoHint: "Therapy instructions on wall or clipboard.",
  },
  {
    id: "staff-responsive",
    category: "engagement",
    label: "Staff responded when needed during visit",
    description: "Call light answered, questions addressed, care plan discussed if possible.",
  },
];

export const CATEGORY_LABELS: Record<CareChecklistItem["category"], string> = {
  environment: "Environment",
  hygiene: "Hygiene",
  nutrition: "Nutrition & hydration",
  mobility: "Mobility & therapy",
  medication: "Medication",
  skin: "Skin integrity",
  engagement: "Engagement & staff",
  safety: "Safety",
};

export function defaultChecklistAnswers(): import("@/types/care").ChecklistAnswer[] {
  return CARE_CHECKLIST.map((item) => ({
    itemId: item.id,
    checked: false,
  }));
}
