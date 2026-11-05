"use client";

import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

/** Tapping the active category again clears it (shows every category). */
export function CategoryNav({
  value,
  onChange,
}: {
  value: CategoryId | null;
  onChange: (value: CategoryId | null) => void;
}) {
  return (
    <nav aria-label="Bill categories" className="relative">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto px-3 sm:justify-between sm:px-5">
        {CATEGORIES.map((category) => {
          const active = category.id === value;
          return (
            <li key={category.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={active}
                title={category.description}
                onClick={() => onChange(active ? null : category.id)}
                className="group relative flex w-[5.25rem] flex-col items-center gap-2 pt-1 pb-3.5"
              >
                <span
                  className={`grid size-16 place-items-center rounded-full transition-all duration-300 group-active:scale-95 ${
                    active
                      ? "bg-maroon-700 text-white shadow-[0_8px_20px_-8px_rgb(110_34_29/0.7)]"
                      : "bg-cream-100 text-maroon-700 group-hover:bg-cream-200"
                  }`}
                >
                  <CategoryIcon category={category.id} className="size-7" strokeWidth={1.7} />
                </span>
                <span
                  className={`text-[0.85rem] transition-colors ${active ? "font-bold text-maroon-700" : "font-medium text-ink-700"}`}
                >
                  {category.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 h-[3px] w-14 rounded-full bg-gold-500 transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
      <div aria-hidden="true" className="mx-4 h-px bg-cream-200 sm:mx-6" />
    </nav>
  );
}
