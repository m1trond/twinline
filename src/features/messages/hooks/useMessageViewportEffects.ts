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
  isPinnedMessagesViewOpen: boolean;
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

  messagesList.scrollTop = getMaxScrollTop(messagesList);
  bottomAnchorRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  messagesList.scrollTop = getMaxScrollTop(messagesList);

  return isNearBottom(messagesList);
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
  isPinnedMessagesViewOpen,
}: MessageViewportEffectsParams) {
  const frameIdsRef = useRef<number[]>([]);
  const lastOpenedChatUserIdRef = useRef<string | null>(null);
  const lastOwnDialogMessageKeyRef = useRef("");
  const releaseIntentTimeoutRef = useRef<number | null>(null);
  const scrollIntentRef = useRef<ScrollIntent | null>(null);

  const prePinsScrollTopRef = useRef<number | null>(null);
  const previousIsPinnedRef = useRef(isPinnedMessagesViewOpen);
  const lastChatUserIdRef = useRef<string | null>(null);

  if (lastChatUserIdRef.current !== selectedChatUserId) {
    lastChatUserIdRef.current = selectedChatUserId;
    prePinsScrollTopRef.current = null;
    previousIsPinnedRef.current = isPinnedMessagesViewOpen;
  }

  useLayoutEffect(() => {
    const messagesList = messagesListRef.current;
    if (!messagesList) {
      return;
    }

    const wasPinnedOpen = previousIsPinnedRef.current;
    previousIsPinnedRef.current = isPinnedMessagesViewOpen;

    if (!wasPinnedOpen && isPinnedMessagesViewOpen) {
      prePinsScrollTopRef.current = messagesList.scrollTop;
    } else if (wasPinnedOpen && !isPinnedMessagesViewOpen) {
      const targetScrollTop = prePinsScrollTopRef.current;
      if (targetScrollTop !== null) {
        let pass = 0;
        const passes = 6;
        function restore() {
          if (previousIsPinnedRef.current) {
            return;
          }
          if (messagesListRef.current) {
            messagesListRef.current.scrollTop = targetScrollTop as number;
          }
          pass++;
          if (pass < passes) {
            window.requestAnimationFrame(restore);
          }
        }
        restore();
      }
    }
  }, [isPinnedMessagesViewOpen, messagesListRef]);

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
    scheduleBottomScroll("open-chat", { holdMs: 700, passes: 8 });
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
      isLoadingMessages ||
      scrollIntentRef.current !== "open-chat"
    ) {
      return;
    }

    scheduleBottomScroll("open-chat", { holdMs: 700, passes: 8 });
  }, [
    activeDialogMessagesCount,
    activeDialogMessagesKey,
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

    scheduleBottomScroll("own-message", { passes: 6 });
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
        scheduleBottomScroll("open-chat", { holdMs: 700, passes: 4 });
      }
    });

    observer.observe(messagesList);

    return () => {
      observer.disconnect();
    };
  }, [messagesListRef, scheduleBottomScroll]);

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
