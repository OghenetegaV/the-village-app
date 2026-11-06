import type { Metadata } from "next";
import { Suspense } from "react";
import { BackButton } from "@/components/layout/BackButton";
import { ProProfileForm } from "@/components/pro/ProProfileForm";
import { requireUser } from "@/server/auth/session";
import { getProProfile } from "@/server/pros";

export const metadata: Metadata = { title: "Professional profile" };

export default function ProPage() {
  return (
    <main className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-12 sm:px-6">
      <BackButton fallback="/community/rooms" />
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-3xl bg-cream-200/70" />}>
        <ProSetup />
      </Suspense>
    </main>
  );
}

async function ProSetup() {
  const user = await requireUser("/pro");
  const existing = await getProProfile(user.id);
  return (
    <>
      <h1 className="mt-5 font-serif text-[2rem] leading-tight font-semibold text-ink-900">
        {existing ? "Your professional profile" : "Join as a professional"}
      </h1>
      <p className="mt-1.5 mb-7 text-ink-500">
        Meet colleagues in your trade across Nigeria, share advice and pass on contract work you can&apos;t take.
      </p>
      <ProProfileForm existing={existing} />
    </>
  );
}
