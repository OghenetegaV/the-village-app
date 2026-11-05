import type { PaymentStatus } from "@/lib/types";

const LABEL: Record<PaymentStatus, { text: string; className: string }> = {
  success: { text: "Confirmed", className: "bg-success-100 text-success-600" },
  pending: { text: "Processing", className: "bg-gold-100 text-gold-600" },
  failed: { text: "Failed", className: "bg-maroon-100 text-maroon-700" },
  abandoned: { text: "Not completed", className: "bg-cream-200 text-ink-500" },
  review: { text: "Under review", className: "bg-gold-100 text-gold-600" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { text, className } = LABEL[status];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[0.68rem] font-bold ${className}`}>{text}</span>;
}
