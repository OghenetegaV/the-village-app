"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Bill } from "@/lib/types";
import { BillCard } from "./BillCard";

const MAX_DOTS = 8;

/**
 * Swipeable feed built on native CSS scroll-snap: touch swiping uses the browser's own momentum
 * and physics. On top of that it adds a depth effect for neighbouring cards, mouse dragging,
 * keyboard arrows, and pagination.
 */
export function BillCarousel({ bills, now }: { bills: Bill[]; now: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const drag = useRef<{ x: number; left: number; moved: boolean; startIndex: number } | null>(null);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2, behavior: "smooth" });
  }, []);

  // Depth effect + active index, recomputed on scroll (throttled to animation frames).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const center = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let best = Infinity;
      (Array.from(track.children) as HTMLElement[]).forEach((el, i) => {
        const offset = (el.offsetLeft + el.offsetWidth / 2 - center) / el.offsetWidth;
        const d = Math.min(Math.abs(offset), 1);
        el.style.setProperty("--depth", d.toFixed(3));
        if (Math.abs(offset) < best) {
          best = Math.abs(offset);
          nearest = i;
        }
      });
      activeRef.current = nearest;
      setActive(nearest);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [bills]);

  // Mouse drag-to-swipe for desktop (touch and pen already scroll natively).
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const track = trackRef.current!;
    drag.current = { x: e.clientX, left: track.scrollLeft, moved: false, startIndex: activeRef.current };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const state = drag.current;
    if (!state) return;
    const dx = e.clientX - state.x;
    if (!state.moved && Math.abs(dx) > 6) {
      state.moved = true;
      trackRef.current!.style.scrollSnapType = "none";
      trackRef.current!.setPointerCapture(e.pointerId);
    }
    if (state.moved) trackRef.current!.scrollLeft = state.left - dx;
  };
  const endDrag = (e: React.PointerEvent) => {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    if (!state.moved) return;
    const track = trackRef.current!;
    track.releasePointerCapture?.(e.pointerId);
    const dx = e.clientX - state.x;
    let target = activeRef.current;
    // A deliberate flick moves at least one card even if it didn't cross the midpoint.
    if (target === state.startIndex && Math.abs(dx) > 40) target += dx < 0 ? 1 : -1;
    const clamped = Math.max(0, Math.min(bills.length - 1, target));
    scrollToIndex(clamped);
    window.setTimeout(() => (track.style.scrollSnapType = ""), 450);
    // Swallow the click that follows a drag so it doesn't open the card.
    track.addEventListener("click", (ev) => ev.preventDefault(), { capture: true, once: true });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollToIndex(Math.min(active + 1, bills.length - 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollToIndex(Math.max(active - 1, 0));
    }
  };

  return (
    <section aria-roledescription="carousel" aria-label="Bills" className="relative">
      <div
        ref={trackRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="no-scrollbar flex snap-x snap-mandatory items-center gap-3 overflow-x-auto overscroll-x-contain py-4 [--card-w:min(84vw,380px)] [padding-inline:calc((100%-var(--card-w))/2)] focus-visible:outline-none"
      >
        {bills.map((bill, i) => (
          <div
            key={bill.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${bills.length}: ${bill.title}`}
            className="w-[var(--card-w)] shrink-0 snap-center snap-always [--depth:1] [transform:scale(calc(1-var(--depth)*0.08))] [opacity:calc(1-var(--depth)*0.3)] transition-[transform,opacity] duration-150 ease-out will-change-transform"
          >
            <BillCard bill={bill} now={now} priority={i < 2} />
          </div>
        ))}
      </div>

      {bills.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous bill"
            disabled={active === 0}
            onClick={() => scrollToIndex(active - 1)}
            className="absolute top-1/2 left-2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-maroon-700 shadow-card transition hover:bg-white disabled:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:grid"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next bill"
            disabled={active === bills.length - 1}
            onClick={() => scrollToIndex(active + 1)}
            className="absolute top-1/2 right-2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-maroon-700 shadow-card transition hover:bg-white disabled:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:grid"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      {bills.length > 1 && (
        <div className="flex h-6 items-center justify-center gap-2" aria-live="polite">
          {bills.length <= MAX_DOTS ? (
            bills.map((bill, i) => (
              <button
                key={bill.id}
                type="button"
                aria-label={`Go to bill ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => scrollToIndex(i)}
                className="grid h-6 place-items-center px-0.5"
              >
                <span
                  className={`block h-2.5 rounded-full transition-all duration-300 ${
                    i === active ? "w-2.5 bg-maroon-700" : "w-2.5 bg-cream-300 hover:bg-gold-400"
                  }`}
                />
              </button>
            ))
          ) : (
            <span className="rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold text-ink-700">
              <span className="text-maroon-700">{active + 1}</span> / {bills.length}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
