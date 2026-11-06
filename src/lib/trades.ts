/** Professional trades — one Pro room each. Add or rename trades here. */
export const TRADES = [
  { id: "lawyers", label: "Lawyers", member: "Lawyer", licenseHint: "e.g. NBA/SCN number" },
  { id: "plumbers", label: "Plumbers", member: "Plumber" },
  { id: "electricians", label: "Electricians", member: "Electrician", licenseHint: "e.g. NEMSA licence" },
  { id: "carpenters", label: "Carpenters", member: "Carpenter" },
  { id: "builders", label: "Builders & Masons", member: "Builder" },
  { id: "engineers", label: "Engineers", member: "Engineer", licenseHint: "e.g. COREN number" },
  { id: "painters", label: "Painters", member: "Painter" },
  { id: "tilers", label: "Tilers", member: "Tiler" },
  { id: "welders", label: "Welders & Fabricators", member: "Welder" },
  { id: "ac-technicians", label: "AC & Refrigeration", member: "AC technician" },
  { id: "mechanics", label: "Mechanics", member: "Mechanic" },
  { id: "tailors", label: "Tailors & Fashion", member: "Tailor" },
  { id: "beauty", label: "Hair & Beauty", member: "Stylist" },
  { id: "caterers", label: "Caterers & Events", member: "Caterer" },
  { id: "photographers", label: "Photo & Video", member: "Photographer" },
  { id: "developers", label: "Software & IT", member: "Developer" },
  { id: "accountants", label: "Accountants", member: "Accountant", licenseHint: "e.g. ICAN number" },
] as const;

export type TradeId = (typeof TRADES)[number]["id"];
export type Trade = (typeof TRADES)[number];

export function isTradeId(value: unknown): value is TradeId {
  return typeof value === "string" && TRADES.some((t) => t.id === value);
}

export function getTrade(id: TradeId): Trade {
  return TRADES.find((t) => t.id === id)!;
}
