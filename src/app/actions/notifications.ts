"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNextPath } from "@/server/auth/session";
import { markAllRead, markRead } from "@/server/notifications";

/** Marks a notification read, then opens it. Works without JavaScript (plain form post). */
export async function openNotification(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");
  const href = await markRead(user.id, String(formData.get("id") ?? ""));
  redirect(safeNextPath(href, "/notifications"));
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");
  await markAllRead(user.id);
  refresh();
}
