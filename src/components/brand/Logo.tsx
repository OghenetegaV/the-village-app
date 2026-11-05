import Link from "next/link";

export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="vlg-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9b06d" />
          <stop offset="1" stopColor="#a87531" />
        </linearGradient>
      </defs>
      {/* Three leaves rising from one root — people growing together. */}
      <path d="M19 36c-7-2.5-12-9-11.5-17.5C14 21 18.5 27 19 36Z" fill="url(#vlg-leaf)" />
      <path d="M21 36c7-2.5 12-9 11.5-17.5C26 21 21.5 27 21 36Z" fill="url(#vlg-leaf)" />
      <path d="M20 33c-3.8-5.2-4.6-13.6 0-21.5 4.6 7.9 3.8 16.3 0 21.5Z" fill="#6e221d" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/home" className="flex min-w-0 items-center gap-2" aria-label="VILLAGE home">
      <LogoMark className="size-9 shrink-0 min-[400px]:size-10" />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-[1.6rem] font-semibold tracking-[0.02em] min-[400px]:text-[1.85rem] text-maroon-700">VILLAGE</span>
        <span className="mt-1 text-[0.5rem] font-semibold tracking-[0.13em] min-[400px]:text-[0.55rem] min-[400px]:tracking-[0.16em] whitespace-nowrap text-maroon-700/80">
          REAL PEOPLE · REAL NEEDS · TOGETHER
        </span>
      </span>
    </Link>
  );
}
