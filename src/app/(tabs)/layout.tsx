import { BottomNav } from "@/components/layout/BottomNav";

export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{children}</main>
      <BottomNav />
    </>
  );
}
