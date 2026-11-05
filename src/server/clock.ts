import "server-only";
import { connection } from "next/server";

/**
 * Opts the current render into dynamic rendering and returns the request's timestamp.
 * Pass the result down to client components so server and client agree on "days left".
 */
export async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}
