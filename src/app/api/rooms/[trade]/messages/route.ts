import { isTradeId } from "@/lib/trades";
import { getCurrentUser } from "@/server/auth/session";
import { read } from "@/server/db/store";
import { isMember, listMessages } from "@/server/pros";

/**
 * Latest messages for a Pro room, polled by the chat UI every few seconds.
 * Members only; responses are never cached.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/rooms/[trade]/messages">) {
  const { trade } = await ctx.params;
  if (!isTradeId(trade)) return Response.json({ error: "Unknown room" }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!isMember(await read(), user.id, trade)) return Response.json({ error: "Members only" }, { status: 403 });

  return Response.json({ messages: await listMessages(trade) }, { headers: { "Cache-Control": "no-store" } });
}
