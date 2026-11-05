"use client";

import Image from "next/image";
import { useState } from "react";
import type { CategoryId } from "@/lib/categories";
import { CategoryIcon } from "./CategoryIcon";

/** Bill cover photo that degrades to a branded illustration if the image can't load. */
export function CoverImage({
  src,
  category,
  sizes,
  priority = false,
  className = "",
}: {
  src: string;
  category: CategoryId;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-maroon-100 via-cream-100 to-gold-100 ${className}`}>
      {failed ? (
        <div className="absolute inset-0 grid place-items-center">
          <CategoryIcon category={category} className="size-14 text-maroon-700/30" strokeWidth={1.3} />
        </div>
      ) : (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          draggable={false}
          className="object-cover select-none"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
