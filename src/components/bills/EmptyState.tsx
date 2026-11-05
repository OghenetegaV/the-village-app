import { SearchX } from "lucide-react";

export function EmptyState({
  description,
  onReset,
  onClearPrice,
}: {
  description: string;
  onReset: () => void;
  onClearPrice?: () => void;
}) {
  return (
    <div className="mx-4 my-6 flex animate-fade-up flex-col items-center rounded-[1.75rem] border border-dashed border-cream-300 bg-white/70 px-6 py-10 text-center sm:mx-6">
      <span className="grid size-16 place-items-center rounded-full bg-cream-100 text-maroon-700">
        <SearchX className="size-7" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-serif text-xl font-semibold text-ink-900">No bills here right now</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">
        We couldn&apos;t find {description}. Try a different price range or category — there&apos;s always someone to help.
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5">
        <button
          type="button"
          onClick={onReset}
          className="h-12 rounded-2xl bg-maroon-700 font-semibold text-white transition hover:bg-maroon-800 active:scale-[0.98]"
        >
          Reset filters
        </button>
        {onClearPrice && (
          <button
            type="button"
            onClick={onClearPrice}
            className="h-12 rounded-2xl border border-maroon-700/30 font-semibold text-maroon-700 transition hover:bg-cream-100"
          >
            Show all prices
          </button>
        )}
      </div>
    </div>
  );
}
