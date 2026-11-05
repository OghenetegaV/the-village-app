import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { isRole } from "@/lib/roles";
import { getCurrentUser, safeNextPath } from "@/server/auth/session";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage({ searchParams }: PageProps<"/register">) {
  return (
    <AuthShell title="Join the village" subtitle="Real people, real needs — together. It takes less than a minute.">
      <Suspense>
        <RegisterContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function RegisterContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { next, role } = await searchParams;
  const nextPath = typeof next === "string" ? safeNextPath(next, "") || null : null;
  if (await getCurrentUser()) redirect(nextPath ?? "/account");
  return <RegisterForm next={nextPath} initialRole={isRole(role) ? role : null} />;
}
