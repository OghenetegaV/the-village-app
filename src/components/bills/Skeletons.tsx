function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-cream-200/70 ${className}`} />;
}

export function BillsFeedSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading bills">
      <div className="mt-5 flex gap-2.5 overflow-hidden px-4 sm:px-6">
        {Array.from({ length: 4 }, (_, i) => (
          <Block key={i} className="h-14 w-[7.25rem] shrink-0 rounded-2xl" />
        ))}
      </div>
      <div className="mt-5 flex gap-4 overflow-hidden px-4 sm:px-6">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex w-[4.75rem] shrink-0 flex-col items-center gap-2">
            <Block className="size-16 rounded-full" />
            <Block className="h-3 w-14" />
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 w-[min(84vw,380px)] overflow-hidden rounded-[1.75rem] border border-cream-200 bg-white">
        <Block className="aspect-[16/10] rounded-none" />
        <div className="space-y-3 p-5">
          <Block className="h-4 w-1/2" />
          <Block className="h-6 w-4/5" />
          <Block className="h-14 w-full" />
          <Block className="h-12 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function BillDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading bill">
      <Block className="aspect-[4/3] rounded-none" />
      <div className="-mt-6 space-y-4 rounded-t-[1.75rem] bg-cream-50 p-5">
        <Block className="h-5 w-24" />
        <Block className="h-8 w-4/5" />
        <Block className="h-12 w-2/3" />
        <Block className="h-32 w-full rounded-3xl" />
        <Block className="h-24 w-full" />
      </div>
    </div>
  );
}
