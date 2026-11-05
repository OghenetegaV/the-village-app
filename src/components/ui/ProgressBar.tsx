export function ProgressBar({
  percent,
  complete = false,
  label,
  size = "md",
}: {
  percent: number;
  complete?: boolean;
  label: string;
  size?: "md" | "lg";
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`w-full overflow-hidden rounded-full bg-cream-200 ${size === "lg" ? "h-3" : "h-2.5"}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${
          complete ? "bg-success-600" : "bg-maroon-700"
        }`}
        style={{ width: `${Math.max(percent, percent > 0 ? 3 : 0)}%` }}
      />
    </div>
  );
}
