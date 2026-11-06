"use client";

import { BadgeCheck, MessagesSquare, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { deleteRoomMessage, sendRoomMessage } from "@/app/actions/pros";
import { Avatar } from "@/components/ui/Avatar";
import type { MessageView } from "@/server/pros";
import { PlusBadge } from "./ProBits";

const POLL_MS = 4000;
const MAX = 1000;

/** Times are shown in Nigerian time so server and browser render identical text. */
const LAGOS = "Africa/Lagos";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: LAGOS }).format(d);
function timeLabel(iso: string) {
  const d = new Date(iso);
  const sameDay = dayKey(d) === dayKey(new Date());
  return new Intl.DateTimeFormat(
    "en-NG",
    sameDay ? { hour: "numeric", minute: "2-digit", timeZone: LAGOS } : { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: LAGOS },
  ).format(d);
}

/**
 * Room chat. New messages arrive by polling (every 4s while the tab is visible) — simple and
 * reliable on any host. Swap for WebSockets/SSE when you move to a real-time backend.
 */
export function ChatRoom({
  trade,
  roomLabel,
  initial,
  viewerId,
  canModerate,
}: {
  trade: string;
  roomLabel: string;
  initial: MessageView[];
  viewerId: string;
  canModerate: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);
  const stickToBottom = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${trade}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: MessageView[] };
      setMessages(data.messages);
    } catch {
      /* offline — try again next tick */
    }
  }, [trade]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  // Keep the view pinned to the newest message unless the reader has scrolled up.
  useLayoutEffect(() => {
    if (stickToBottom.current) window.scrollTo({ top: document.body.scrollHeight });
  }, [messages]);
  useEffect(() => {
    const onScroll = () => {
      stickToBottom.current = window.innerHeight + window.scrollY >= document.body.scrollHeight - 120;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setError(null);
    startSending(async () => {
      const result = await sendRoomMessage(trade, body);
      if (result.ok) {
        setDraft("");
        stickToBottom.current = true;
        setMessages((prev) => (prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message]));
        inputRef.current?.focus();
      } else {
        setError(result.error);
      }
    });
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this message for everyone?")) return;
    const res = await deleteRoomMessage(id);
    if (res.ok) setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, body: null } : m)));
  }

  return (
    <>
      {messages.length === 0 ? (
        <div className="mt-10 flex flex-col items-center px-6 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-cream-100 text-maroon-700">
            <MessagesSquare className="size-7" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <p className="mt-3 font-serif text-lg font-semibold text-ink-900">Start the conversation</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">Say hello to fellow {roomLabel.toLowerCase()} across Nigeria.</p>
        </div>
      ) : (
        <ol ref={listRef} className="space-y-3 px-4 py-4 sm:px-6" aria-label={`${roomLabel} chat`} aria-live="polite">
          {messages.map((m, i) => {
            const mine = m.author.userId === viewerId;
            const prev = messages[i - 1];
            const grouped = prev && prev.author.userId === m.author.userId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
            return (
              <li key={m.id} className={`group flex gap-2.5 ${mine ? "flex-row-reverse" : ""} ${grouped ? "-mt-1.5" : ""}`}>
                <span className={`w-9 shrink-0 ${grouped ? "invisible" : ""}`}>{!mine && <Avatar name={m.author.name} size={36} />}</span>
                <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                  {!grouped && !mine && (
                    <p className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-ink-900">{m.author.name}</span>
                      {m.author.plus && <PlusBadge />}
                      {"hasLicense" in m.author && m.author.hasLicense && (
                        <BadgeCheck className="size-3.5 fill-gold-500 text-white" aria-label="Licence on file" />
                      )}
                      {"state" in m.author && <span className="text-ink-400">· {m.author.state}</span>}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-[0.93rem] leading-relaxed break-words whitespace-pre-wrap ${
                      m.body === null
                        ? "border border-dashed border-cream-300 bg-transparent text-ink-400 italic"
                        : mine
                          ? "rounded-tr-md bg-maroon-700 text-white"
                          : "rounded-tl-md border border-cream-200 bg-white text-ink-900"
                    }`}
                  >
                    {m.body ?? "Message removed"}
                  </div>
                  <span className="mt-1 flex items-center gap-2 text-[0.68rem] text-ink-400">
                    <time dateTime={m.createdAt} suppressHydrationWarning>
                      {timeLabel(m.createdAt)}
                    </time>
                    {m.body !== null && (mine || canModerate) && (
                      <button
                        type="button"
                        onClick={() => remove(m.id)}
                        className="inline-flex items-center gap-0.5 opacity-70 hover:text-maroon-700 hover:opacity-100"
                        aria-label="Remove message"
                      >
                        <Trash2 className="size-3" aria-hidden="true" /> Remove
                      </button>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="sticky bottom-0 mt-auto border-t border-cream-200 bg-cream-50/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
      >
        {error && (
          <p role="alert" className="mb-2 px-1 text-sm font-medium text-danger-500">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message {roomLabel}
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={MAX}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${roomLabel}…`}
            className="max-h-36 min-h-12 flex-1 resize-none rounded-2xl border-2 border-cream-200 bg-white px-4 py-3 text-ink-900 outline-none placeholder:text-ink-400 focus:border-maroon-700"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-maroon-700 text-white transition hover:bg-maroon-800 disabled:opacity-40"
          >
            <Send className="size-5" aria-hidden="true" />
          </button>
        </div>
        {draft.length > MAX - 150 && (
          <p className="mt-1 px-1 text-right text-xs text-ink-500 tabular-nums">
            {draft.length}/{MAX}
          </p>
        )}
      </form>
    </>
  );
}
