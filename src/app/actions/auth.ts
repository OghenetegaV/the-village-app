"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isRole } from "@/lib/roles";
import { getDummyHash, hashPassword, verifyPassword } from "@/server/auth/password";
import { checkRateLimit, clearRateLimit } from "@/server/auth/rate-limit";
import { endSession, safeNextPath, startSession } from "@/server/auth/session";
import { createUser, EmailTakenError, findUserByEmail } from "@/server/users-repository";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  /** Echoed back so the form keeps what the user typed (never includes the password). */
  values?: Record<string, string>;
}

/** Normalizes Nigerian numbers to +234XXXXXXXXXX; returns null if invalid. */
function normalizeNigerianPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  let national: string;
  if (digits.startsWith("+234")) national = digits.slice(4);
  else if (digits.startsWith("234")) national = digits.slice(3);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else return null;
  return /^[789][01]\d{8}$/.test(national) ? `+234${national}` : null;
}

const RegisterSchema = z.object({
  role: z.string().refine(isRole, "Choose how you'll use VILLAGE."),
  fullName: z.string().trim().min(2, "Enter your full name.").max(60, "Keep your name under 60 characters."),
  email: z.email("Enter a valid email address.").max(254).transform((e) => e.toLowerCase()),
  phone: z.string().trim().max(20),
  location: z.string().trim().max(60),
  password: z.string().min(8, "Use at least 8 characters.").max(128, "Use at most 128 characters."),
  terms: z.literal("on", { error: "Please accept the terms to continue." }),
});

/** Role-dependent rules, checked separately so every error is reported in one pass. */
function roleFieldErrors(role: string, phone: string, location: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (phone.trim() && !normalizeNigerianPhone(phone)) {
    errors.phone = "Enter a valid Nigerian phone number, e.g. 0803 123 4567.";
  }
  if (role === "beneficiary") {
    if (!phone.trim()) errors.phone = "A phone number is required so we can verify your bills.";
    if (!location.trim()) errors.location = "Tell supporters where you're based.";
  }
  return errors;
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    role: String(formData.get("role") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    location: String(formData.get("location") ?? ""),
    password: String(formData.get("password") ?? ""),
    terms: formData.get("terms") ?? undefined,
  };
  // Echo back what was typed — never the password.
  const echo: Record<string, string> = {
    role: raw.role,
    fullName: raw.fullName,
    email: raw.email,
    phone: raw.phone,
    location: raw.location,
    terms: raw.terms ? "on" : "",
  };

  const parsed = RegisterSchema.safeParse(raw);
  const fieldErrors = roleFieldErrors(raw.role, raw.phone, raw.location);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  }
  if (!parsed.success || Object.keys(fieldErrors).length) return { fieldErrors, values: echo };

  const data = parsed.data;
  let userId: string;
  try {
    const user = await createUser({
      role: data.role as "supporter" | "beneficiary",
      fullName: data.fullName,
      email: data.email,
      phone: data.phone ? normalizeNigerianPhone(data.phone) : null,
      location: data.location || null,
      passwordHash: await hashPassword(data.password),
    });
    userId = user.id;
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return { fieldErrors: { email: "An account with this email already exists. Try signing in." }, values: echo };
    }
    throw error;
  }

  await startSession(userId);
  const next = safeNextPath(formData.get("next"), data.role === "beneficiary" ? "/bills/new?welcome=1" : "/bills");
  redirect(next);
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { email };

  if (!email || !password) return { error: "Enter your email and password.", values };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limitKey = `login:${ip}:${email}`;
  const limit = checkRateLimit(limitKey, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterMs / 60000);
    return { error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, values };
  }

  const user = await findUserByEmail(email);
  // Always run a hash comparison so timing doesn't reveal whether the email exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) return { error: "That email and password don't match our records.", values };

  clearRateLimit(limitKey);
  await startSession(user.id);
  redirect(safeNextPath(formData.get("next"), "/bills"));
}

export async function logout() {
  await endSession();
  redirect("/bills");
}
