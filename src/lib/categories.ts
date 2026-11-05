export const CATEGORIES = [
  {
    id: "health",
    label: "Health",
    description: "Hospital bills, medical expenses, medication, consultations and other healthcare costs.",
  },
  {
    id: "education",
    label: "Education",
    description: "School fees, tuition, books, educational materials and examination fees.",
  },
  {
    id: "utility",
    label: "Utility",
    description: "Electricity, water, internet, rent-related utility charges and other essential household bills.",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    description: "Personal expenses, experiences, events, hobbies and other lifestyle needs.",
  },
  {
    id: "wish-list",
    label: "Wish-List",
    description: "Items, experiences or personal goals people want help to purchase or fund.",
  },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type Category = (typeof CATEGORIES)[number];

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && CATEGORIES.some((c) => c.id === value);
}

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id)!;
}
