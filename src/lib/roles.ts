/**
 * Account types. Change the labels here to rename them everywhere in the UI.
 * - supporter: helps pay other people's bills ("giver")
 * - beneficiary: posts bills they need help with ("receiver")
 */
export const ROLES = {
  supporter: {
    id: "supporter",
    label: "Supporter",
    headline: "I want to help",
    description: "Discover real bills and pay or contribute towards them. Track the difference you make.",
  },
  beneficiary: {
    id: "beneficiary",
    label: "Beneficiary",
    headline: "I need help with a bill",
    description: "Post a bill — school fees, hospital, utilities — and let your village help you pay it.",
  },
} as const;

export type Role = keyof typeof ROLES;

export function isRole(value: unknown): value is Role {
  return value === "supporter" || value === "beneficiary";
}
