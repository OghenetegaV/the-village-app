import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser, safeNextPath } from "@/server/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to keep helping — and getting help from — your village.">
      <Suspense>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function LoginContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? safeNextPath(next, "") || null : null;
  if (await getCurrentUser()) redirect(nextPath ?? "/bills");
  return <LoginForm next={nextPath} />;
}
