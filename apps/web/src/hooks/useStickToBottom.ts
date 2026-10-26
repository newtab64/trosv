import { useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";

const NEAR_BOTTOM_THRESHOLD = 150;

function getDistanceToBottom(el: HTMLElement): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight;
}

/**
 * Autoscroll for chat threads:
 * - On initial thread load or conversation switch: immediately scroll to the bottom
 *   so the user always sees the latest messages first.
 * - Follow new content and layout expansions (e.g. room preview cards, images)
 *   ONLY while the user is actually at the bottom (distance < 30px).
 * - If the user scrolls up to read history or interact with older messages,
 *   never yank their view.
 */
export function useStickToBottom(
  threadRef: RefObject<HTMLDivElement>,
  messages: unknown,
  loaded: boolean,
  conversationId?: string | number  
): {
  handleScroll: () => boolean;
  scrollToBottom: (smooth?: boolean) => void;
  notifyMounted: (el: HTMLDivElement) => void;
} {
  const prevConvIdRef = useRef<string | number | undefined>(conversationId);
  const initialScrollDoneRef = useRef(false);
  const roRef = useRef<ResizeObserver | null>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = threadRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [threadRef]);

  const attachObserver = useCallback((el: HTMLDivElement) => {
    if (typeof ResizeObserver === "undefined") return;
    if (roRef.current) {
      roRef.current.disconnect();
    }
    const ro = new ResizeObserver(() => {
      // Only keep pinned if initial scroll has not settled OR user is physically at the bottom
      const dist = getDistanceToBottom(el);
      if (!initialScrollDoneRef.current || dist < 30) {
        el.scrollTop = el.scrollHeight;
      }
    });
    ro.observe(el);
    roRef.current = ro;
  }, []);

  const notifyMounted = useCallback((el: HTMLDivElement) => {
    attachObserver(el);

    if (!initialScrollDoneRef.current) {
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        initialScrollDoneRef.current = true;
      });
    }
  }, [attachObserver]);

  // When conversation ID switches, reset initial scroll flag
  useEffect(() => {
    if (conversationId !== prevConvIdRef.current) {
      prevConvIdRef.current = conversationId;
      initialScrollDoneRef.current = false;
      if (threadRef.current) {
        notifyMounted(threadRef.current);
      }
    }
  }, [conversationId, notifyMounted, threadRef]);

  // When messages or loaded status change:
  useEffect(() => {
    const el = threadRef.current;
    if (!el || !loaded) return;

    if (!initialScrollDoneRef.current) {
      notifyMounted(el);
      return;
    }

    // Only stick to bottom if user is already at the bottom
    const dist = getDistanceToBottom(el);
    if (dist < 60) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loaded, conversationId, notifyMounted, threadRef]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
    };
  }, []);

  function handleScroll(): boolean {
    const el = threadRef.current;
    if (!el) return false;
    const distanceToBottom = getDistanceToBottom(el);
    return distanceToBottom < NEAR_BOTTOM_THRESHOLD;
  }

  return {
    handleScroll,
    scrollToBottom,
    notifyMounted,
  };
}
