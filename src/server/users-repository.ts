import "server-only";
import { randomUUID } from "node:crypto";
import type { Role } from "@/lib/roles";
import type { User } from "@/lib/types";
import { read, transaction } from "./db/store";
import { notify } from "./notifications";

export async function findUserByEmail(email: string): Promise<User | null> {
  const { users } = await read();
  return users.find((u) => u.email === email.toLowerCase()) ?? null;
}

export class EmailTakenError extends Error {}

export async function createUser(input: {
  role: Role;
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  passwordHash: string;
}): Promise<User> {
  return transaction((db) => {
    const email = input.email.toLowerCase();
    // Checked inside the write lock so two simultaneous sign-ups can't claim the same email.
    if (db.users.some((u) => u.email === email)) throw new EmailTakenError();
    const user: User = { id: randomUUID(), ...input, email, createdAt: new Date().toISOString() };
    db.users.push(user);
    notify(db, {
      userId: user.id,
      kind: "welcome",
      title: `Welcome to VILLAGE, ${user.fullName.split(" ")[0]}!`,
      body:
        user.role === "beneficiary"
          ? "Post a bill and share it — supporters can start helping right away."
          : "Swipe through real bills and help someone today. Every naira counts.",
      href: user.role === "beneficiary" ? "/bills/new" : "/bills",
    });
    return user;
  });
}
