import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { ActiveView } from "@/shared/types";

type MessageViewportEffectsParams = {
  activeView: ActiveView;
  activeDialogMessagesCount: number;
  activeDialogMessagesKey: string;
  bottomAnchorRef: RefObject<HTMLDivElement | null>;
  favoriteItemsCount: number;
  favoriteItemsKey: string;
  highlightedMessageTimeoutRef: RefObject<number | null>;
  isLoadingMessages: boolean;
  lastOwnDialogMessageKey: string;
  messagesListRef: RefObject<HTMLDivElement | null>;
  selectedChatUserId: string | null;
};

type ScrollIntent = "open-chat" | "own-message" | "favorites";

function getMaxScrollTop(messagesList: HTMLDivElement) {
  return Math.max(0, messagesList.scrollHeight - messagesList.clientHeight);
}

function isNearBottom(messagesList: HTMLDivElement) {
  return getMaxScrollTop(messagesList) - messagesList.scrollTop <= 12;
}

function scrollMessagesListToBottom(
  messagesListRef: RefObject<HTMLDivElement | null>,
  bottomAnchorRef: RefObject<HTMLDivElement | null>,
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
  activeDialogMessagesCount,
  activeDialogMessagesKey,
  bottomAnchorRef,
  favoriteItemsCount,
  favoriteItemsKey,
  highlightedMessageTimeoutRef,
  isLoadingMessages,
  lastOwnDialogMessageKey,
  messagesListRef,
  selectedChatUserId,
}: MessageViewportEffectsParams) {
  const frameIdsRef = useRef<number[]>([]);
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

      scrollMessagesListToBottom(messagesListRef, bottomAnchorRef);

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
    bottomAnchorRef,
    cancelScheduledScroll,
    clearReleaseIntentTimeout,
    messagesListRef,
  ]);

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

    lastOpenedChatUserIdRef.current = selectedChatUserId;
    lastOwnDialogMessageKeyRef.current = lastOwnDialogMessageKey;
    scrollIntentRef.current = "open-chat";
    scheduleBottomScroll("open-chat", { holdMs: 1200, passes: 8 });
  }, [
    activeView,
    clearScrollIntent,
    lastOwnDialogMessageKey,
    scheduleBottomScroll,
    selectedChatUserId,
  ]);

  useLayoutEffect(() => {
    if (
      activeView !== "messages" ||
      selectedChatUserId === null ||
      isLoadingMessages
    ) {
      return;
    }

    scrollIntentRef.current = "open-chat";
    scheduleBottomScroll("open-chat", { holdMs: 1200, passes: 8 });
  }, [
    activeView,
    isLoadingMessages,
    scheduleBottomScroll,
    selectedChatUserId,
  ]);

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

  useLayoutEffect(() => {
    if (activeView !== "favorites") {
      return;
    }

    scheduleBottomScroll("favorites", { passes: 4 });
  }, [activeView, favoriteItemsCount, favoriteItemsKey, scheduleBottomScroll]);

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

  useLayoutEffect(() => {
    const messagesList = messagesListRef.current;

    if (!messagesList || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (scrollIntentRef.current === "open-chat") {
        scheduleBottomScroll("open-chat", { holdMs: 1200, passes: 6 });
      }
    });

    observer.observe(messagesList);

    return () => {
      observer.disconnect();
    };
  }, [messagesListRef, scheduleBottomScroll]);

  // Auto-scroll when new messages arrive if near bottom
  const lastMessagesKeyRef = useRef("");
  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null || activeDialogMessagesKey === "") {
      return;
    }
    const prevKey = lastMessagesKeyRef.current;
    lastMessagesKeyRef.current = activeDialogMessagesKey;

    if (prevKey === activeDialogMessagesKey || prevKey === "") {
      return;
    }

    const messagesList = messagesListRef.current;
    if (messagesList && isNearBottom(messagesList)) {
      scheduleBottomScroll("own-message", { passes: 2 });
    }
  }, [activeView, activeDialogMessagesKey, scheduleBottomScroll, selectedChatUserId, messagesListRef]);

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
