import { Gift, GraduationCap, HeartPulse, Martini, Zap, type LucideIcon, type LucideProps } from "lucide-react";
import type { CategoryId } from "@/lib/categories";

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  health: HeartPulse,
  education: GraduationCap,
  utility: Zap,
  lifestyle: Martini,
  "wish-list": Gift,
};

export function CategoryIcon({ category, ...props }: { category: CategoryId } & LucideProps) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon aria-hidden="true" {...props} />;
}
