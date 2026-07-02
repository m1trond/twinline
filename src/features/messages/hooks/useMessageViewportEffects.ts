import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { ActiveView } from "@/shared/types";

type MessageViewportEffectsParams = {
  activeView: ActiveView;
  activeDialogMessagesKey: string;
  favoriteItemsCount: number;
  favoriteItemsKey: string;
  highlightedMessageTimeoutRef: RefObject<number | null>;
  isActiveDialogReady: boolean;
  lastOwnDialogMessageKey: string;
  messagesListRef: RefObject<HTMLDivElement | null>;
  selectedChatUserId: string | null;
};

type ScrollIntent = "open-chat" | "own-message" | "favorites";

function scrollMessagesListToBottom(
  messagesListRef: RefObject<HTMLDivElement | null>,
) {
  const messagesList = messagesListRef.current;

  if (!messagesList) {
    return false;
  }

  const maxScroll = messagesList.scrollHeight - messagesList.clientHeight;
  messagesList.scrollTop = maxScroll;

  return true;
}

export function useMessageViewportEffects({
  activeView,
  activeDialogMessagesKey,
  favoriteItemsCount,
  favoriteItemsKey,
  highlightedMessageTimeoutRef,
  isActiveDialogReady,
  lastOwnDialogMessageKey,
  messagesListRef,
  selectedChatUserId,
}: MessageViewportEffectsParams) {
  // Disable browser native scroll restoration — we handle it manually
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      const original = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      return () => {
        window.history.scrollRestoration = original;
      };
    }
  }, []);

  const frameIdsRef = useRef<number[]>([]);
  // Tracks which chat was last opened — used to detect chat switches
  const lastOpenedChatUserIdRef = useRef<string | null>(null);
  const lastOwnDialogMessageKeyRef = useRef("");
  const releaseIntentTimeoutRef = useRef<number | null>(null);
  const scrollIntentRef = useRef<ScrollIntent | null>(null);

  const cancelScheduledScroll = useCallback(() => {
    for (const frameId of frameIdsRef.current) {
      window.cancelAnimationFrame(frameId);
    }

    frameIdsRef.current = [];
  }, []);

  const clearReleaseIntentTimeout = useCallback(() => {
    if (releaseIntentTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(releaseIntentTimeoutRef.current);
    releaseIntentTimeoutRef.current = null;
  }, []);

  const clearScrollIntent = useCallback(() => {
    cancelScheduledScroll();
    clearReleaseIntentTimeout();
    scrollIntentRef.current = null;
  }, [cancelScheduledScroll, clearReleaseIntentTimeout]);

  const scheduleBottomScroll = useCallback((intent: ScrollIntent, options?: { holdMs?: number; passes?: number }) => {
    cancelScheduledScroll();
    clearReleaseIntentTimeout();
    scrollIntentRef.current = intent;

    const passes = options?.passes ?? 5;

    function run(passIndex: number) {
      if (scrollIntentRef.current !== intent) {
        return;
      }

      scrollMessagesListToBottom(messagesListRef);

      if (passIndex >= passes) {
        if (options?.holdMs) {
          releaseIntentTimeoutRef.current = window.setTimeout(() => {
            if (scrollIntentRef.current === intent) {
              scrollIntentRef.current = null;
            }

            releaseIntentTimeoutRef.current = null;
          }, options.holdMs);
        } else {
          scrollIntentRef.current = null;
        }

        return;
      }

      const frameId = window.requestAnimationFrame(() => run(passIndex + 1));
      frameIdsRef.current.push(frameId);
    }

    run(0);
  }, [
    cancelScheduledScroll,
    clearReleaseIntentTimeout,
    messagesListRef,
  ]);

  // ─── Chat switch detection ──────────────────────────────────────────────────
  // When the user opens a different chat, reset refs so the key-based effect
  // below knows a fresh initial scroll is needed.
  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      lastOpenedChatUserIdRef.current = null;
      lastOwnDialogMessageKeyRef.current = "";
      clearScrollIntent();
      return;
    }

    if (lastOpenedChatUserIdRef.current === selectedChatUserId) {
      return;
    }

    // New chat opened — reset tracking state but do NOT scroll yet.
    // The scroll will happen in the activeDialogMessagesKey effect below
    // once messages are actually in the DOM.
    lastOpenedChatUserIdRef.current = selectedChatUserId;
    lastOwnDialogMessageKeyRef.current = lastOwnDialogMessageKey;
  }, [
    activeView,
    clearScrollIntent,
    lastOwnDialogMessageKey,
    selectedChatUserId,
  ]);

  // ─── Own-message sent ───────────────────────────────────────────────────────
  // Scroll to bottom when the current user sends a new message.
  useLayoutEffect(() => {
    if (
      activeView !== "messages" ||
      selectedChatUserId === null ||
      lastOwnDialogMessageKey === ""
    ) {
      return;
    }

    const previousOwnMessageKey = lastOwnDialogMessageKeyRef.current;
    lastOwnDialogMessageKeyRef.current = lastOwnDialogMessageKey;

    if (previousOwnMessageKey === lastOwnDialogMessageKey) {
      return;
    }

    scheduleBottomScroll("own-message", { passes: 2 });
  }, [activeView, lastOwnDialogMessageKey, scheduleBottomScroll, selectedChatUserId]);

  // ─── Favorites view ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (activeView !== "favorites") {
      return;
    }

    scheduleBottomScroll("favorites", { passes: 4 });
  }, [activeView, favoriteItemsCount, favoriteItemsKey, scheduleBottomScroll]);

  // ─── Cancel intent on manual scroll ─────────────────────────────────────────
  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      return;
    }

    const messagesList = messagesListRef.current;

    if (!messagesList) {
      return;
    }

    function cancelOpenScrollIntent() {
      if (scrollIntentRef.current === "open-chat") {
        clearScrollIntent();
      }
    }

    messagesList.addEventListener("wheel", cancelOpenScrollIntent, { passive: true });
    messagesList.addEventListener("touchmove", cancelOpenScrollIntent, { passive: true });
    messagesList.addEventListener("pointerdown", cancelOpenScrollIntent);
    messagesList.addEventListener("keydown", cancelOpenScrollIntent);

    return () => {
      messagesList.removeEventListener("wheel", cancelOpenScrollIntent);
      messagesList.removeEventListener("touchmove", cancelOpenScrollIntent);
      messagesList.removeEventListener("pointerdown", cancelOpenScrollIntent);
      messagesList.removeEventListener("keydown", cancelOpenScrollIntent);
    };
  }, [activeView, clearScrollIntent, messagesListRef, selectedChatUserId]);

  // ─── ResizeObserver: re-apply scroll during open-chat intent ────────────────
  useLayoutEffect(() => {
    const messagesList = messagesListRef.current;

    if (!messagesList || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (scrollIntentRef.current === "open-chat") {
        scheduleBottomScroll("open-chat", { holdMs: 2500, passes: 50 });
      }
    });

    observer.observe(messagesList);

    return () => {
      observer.disconnect();
    };
  }, [messagesListRef, scheduleBottomScroll]);

  // ─── Messages key tracker ────────────────────────────────────────────────────
  // Tracks the last messages key per chat. Reset when chat changes.
  const lastMessagesKeyRef = useRef("");

  useEffect(() => {
    lastMessagesKeyRef.current = "";
  }, [selectedChatUserId]);

  // ─── Primary scroll trigger: fires when messages load into DOM ───────────────
  //
  // This is the single source of truth for scroll-to-bottom on chat open.
  //
  // Sequence of events on page refresh:
  //  1. selectedChatUserId is set → chat-switch effect resets refs
  //  2. Messages are fetched → activeDialogMessagesKey changes from "" to a real value
  //  3. THIS effect fires: prevKey === "" → initial open → scheduleBottomScroll
  //  4. Additional message batches arrive → key changes again → isNearBottom check
  useLayoutEffect(() => {
    if (
      activeView !== "messages" ||
      selectedChatUserId === null ||
      !isActiveDialogReady ||
      activeDialogMessagesKey === ""
    ) {
      return;
    }

    const prevKey = lastMessagesKeyRef.current;
    lastMessagesKeyRef.current = activeDialogMessagesKey;

    if (prevKey === activeDialogMessagesKey) {
      return;
    }

    if (prevKey === "") {
      // Initial load for this chat: scroll to bottom firmly with retries
      scheduleBottomScroll("open-chat", { holdMs: 2500, passes: 50 });
      return;
    }

    // Subsequent messages are handled by the own-message effect only.
    // Incoming messages should not pull the recipient to the bottom.
  }, [activeView, activeDialogMessagesKey, isActiveDialogReady, scheduleBottomScroll, selectedChatUserId]);

  // ─── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    const timeoutRef = highlightedMessageTimeoutRef;

    return () => {
      clearScrollIntent();

      const highlightedMessageTimeoutId = timeoutRef.current;

      if (highlightedMessageTimeoutId !== null) {
        window.clearTimeout(highlightedMessageTimeoutId);
      }
    };
  }, [clearScrollIntent, highlightedMessageTimeoutRef]);
}
