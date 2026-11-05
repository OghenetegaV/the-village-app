import Image from "next/image";

const TONES = [
  "bg-maroon-100 text-maroon-700",
  "bg-gold-100 text-gold-600",
  "bg-[#e7efe9] text-[#2f6a4a]",
  "bg-[#e9e7f3] text-[#4a3f8a]",
  "bg-[#f3e6ea] text-[#8a2f4f]",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function toneFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

export function Avatar({ name, src, size = 44 }: { name: string; src?: string; size?: number }) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-2 ring-white"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-serif font-semibold ring-2 ring-white ${toneFor(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}
