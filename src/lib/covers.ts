import type { CategoryId } from "./categories";

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=75`;

/** Curated cover photos used when a beneficiary posts a bill (until photo upload is added). */
export const CATEGORY_COVERS: Record<CategoryId, string[]> = {
  health: ["photo-1584515933487-779824d29309", "photo-1576091160550-2173dba999ef", "photo-1579684385127-1ef15d508118"].map(img),
  education: ["photo-1580582932707-520aed937b7b", "photo-1497633762265-9d179a990aa6", "photo-1503676260728-1c00da094a0b"].map(img),
  utility: ["photo-1473341304170-971dccb5ac1e", "photo-1509391366360-2e959784a276"].map(img),
  lifestyle: ["photo-1511795409834-ef04bbd61622", "photo-1504674900247-0877df9cc836", "photo-1492684223066-81342ee5ff30"].map(img),
  "wish-list": ["photo-1486312338219-ce68d2c6f44d", "photo-1513201099705-a9746e1e201f", "photo-1530103862676-de8c9debad1d"].map(img),
};
