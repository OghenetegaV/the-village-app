"use client";

import Link from "next/link";
import { Ellipsis, Eye, Link2, Share2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export function BillCardMenu({ billId, title }: { billId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const url = () => `${window.location.origin}/bills/${billId}`;

  async function share() {
    setOpen(false);
    if (navigator.share) {
      await navigator.share({ title, text: `Help pay this bill on VILLAGE: ${title}`, url: url() }).catch(() => {});
    } else {
      await copy();
    }
  }

  async function copy() {
    await navigator.clipboard?.writeText(url()).catch(() => {});
    setCopied(true);
    setOpen(false);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div ref={ref} className="relative z-10">
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="grid size-9 place-items-center rounded-full text-ink-500 transition hover:bg-cream-100 hover:text-ink-900"
      >
        <Ellipsis className="size-5" />
      </button>
      {copied && (
        <span role="status" className="absolute top-full right-0 mt-1 rounded-lg bg-ink-900 px-2.5 py-1 text-xs whitespace-nowrap text-white">
          Link copied
        </span>
      )}
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute top-full right-0 mt-1 w-44 animate-fade-up overflow-hidden rounded-2xl border border-cream-200 bg-white py-1.5 shadow-card"
        >
          <Link role="menuitem" href={`/bills/${billId}`} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-cream-100">
            <Eye className="size-4 text-gold-600" /> View details
          </Link>
          <button role="menuitem" type="button" onClick={share} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-cream-100">
            <Share2 className="size-4 text-gold-600" /> Share bill
          </button>
          <button role="menuitem" type="button" onClick={copy} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-cream-100">
            <Link2 className="size-4 text-gold-600" /> Copy link
          </button>
        </div>
      )}
    </div>
  );
}
