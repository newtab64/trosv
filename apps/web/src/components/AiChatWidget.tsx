import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { aiChat } from "@/api/aiApi";
import type { AiChatTurn } from "@/types/api";
import { AI_CHAT_OPEN_EVENT } from "@/constants/events";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";
import { Bot, X, Send } from "lucide-react";

/*
  Floating AI chat: site-wide widget listening for AI_CHAT_OPEN_EVENT
  (Home tiles dispatch it). POST /ai/chat with rolling history; handles
  ~30s latency (spinner in the thread) and 503 (friendly note).
*/

const WELCOME: AiChatTurn = {
  role: "assistant",
  content:
    "Chào bạn. Mình là trợ lý AI của TROSV. Bạn hỏi mình về giá phòng, khu vực, hay phong trọ nhé.",
};

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<AiChatTurn[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function openChat(): void {
      setOpen(true);
    }
    window.addEventListener(AI_CHAT_OPEN_EVENT, openChat);
    return () => { window.removeEventListener(AI_CHAT_OPEN_EVENT, openChat); };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, busy]);

  async function send(): Promise<void> {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    const next: AiChatTurn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setBusy(true);
    try {
      const { reply } = await aiChat(text, next.filter((t) => t !== WELCOME));
      setTurns((cur) => [...cur, { role: "assistant", content: reply ?? "" }]);
    } catch {
      setTurns((cur) => [
        ...cur,
        {
          role: "assistant",
          content: "Trợ lý AI đang bận. Bạn thử lại sau ít phút nhé.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  /* Hidden on messages (avoids blocking chat input/send), auth, and landlord screens */
  const isMessagesPage = location.pathname.startsWith("/messages");
  const isAuthPage = location.pathname.startsWith("/login") || location.pathname.startsWith("/register");
  const isLandlordPage = location.pathname.startsWith("/landlord");
  if (isMessagesPage || isAuthPage || isLandlordPage) return null;

  const isRoomDetail = /^\/rooms\/\d+/.test(location.pathname);

  return (
    <div className={cn("fixed right-4 z-40 lg:bottom-6", isRoomDetail ? "bottom-32" : "bottom-20")}>
      {open ? (
        <div
          role="dialog"
          aria-label="Trợ lý AI"
          className="flex h-[30rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-pop animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-plate px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/15 text-white">
                <Bot className="size-4.5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Trợ lý AI TROSV</p>
                <p className="text-[11px] text-white/80 leading-tight">Hỏi về giá phòng & khu vực</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setOpen(false); }}
              aria-label="Đóng trò chuyện"
              className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {/* Conversation history */}
          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-paper/40 p-3.5">
            {turns.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
                  t.role === "user"
                    ? "self-end rounded-2xl rounded-br-xs bg-plate text-white shadow-xs"
                    : "self-start rounded-2xl rounded-bl-xs bg-card text-ink border border-line shadow-xs"
                )}
              >
                {t.content}
              </div>
            ))}
            {busy ? (
              <div className="self-start rounded-2xl rounded-bl-xs bg-card px-3.5 py-2 text-xs text-muted border border-line" aria-live="polite">
                Trợ lý AI đang tìm câu trả lời…
              </div>
            ) : null}
          </div>

          {/* Input composer */}
          <form
            className="flex items-center gap-2 border-t border-line bg-card p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={draft}
              onChange={(e) => { setDraft(e.target.value.slice(0, 1000)); }}
              aria-label="Hỏi trợ lý AI"
              placeholder="Nhập câu hỏi..."
              className="h-10 flex-1 rounded-xl border border-line-strong bg-card text-ink px-3.5 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="h-10 px-3.5"
              disabled={busy || !draft.trim()}
            >
              <Send className="size-4" aria-hidden />
              <span className="sr-only">Gửi</span>
            </Button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setOpen(true); }}
          aria-label="Mở trợ lý AI"
          className="group relative flex size-13 items-center justify-center rounded-full bg-plate text-white shadow-lg transition-all hover:bg-plate-hover hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate focus-visible:ring-offset-2"
        >
          <Bot className="size-6 transition-transform group-hover:rotate-6" aria-hidden />
          <span className="absolute -top-0.5 -right-0.5 flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flyer opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-flyer border-2 border-white" />
          </span>
        </button>
      )}
    </div>
  );
}
