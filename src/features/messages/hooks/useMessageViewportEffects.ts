import { useEffect, useLayoutEffect, useRef } from "react";
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

function scrollMessagesListToBottom(
  messagesListRef: RefObject<HTMLDivElement | null>,
  bottomAnchorRef?: RefObject<HTMLDivElement | null>,
) {
  const bottomAnchor = bottomAnchorRef?.current;

  if (bottomAnchor) {
    bottomAnchor.scrollIntoView({ block: "end", behavior: "auto" });
    return;
  }

  const messagesList = messagesListRef.current;

  if (!messagesList) {
    return;
  }

  messagesList.scrollTop = Math.max(
    0,
    messagesList.scrollHeight - messagesList.clientHeight,
  );
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
  const lastOpenedChatUserIdRef = useRef<string | null>(null);
  const lastOwnDialogMessageKeyRef = useRef("");
  const openedChatStopTimeoutRef = useRef<number | null>(null);
  const shouldOpenChatAtBottomRef = useRef(false);

  function clearOpenedChatStopTimeout() {
    if (openedChatStopTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(openedChatStopTimeoutRef.current);
    openedChatStopTimeoutRef.current = null;
  }

  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      lastOpenedChatUserIdRef.current = null;
      lastOwnDialogMessageKeyRef.current = "";
      shouldOpenChatAtBottomRef.current = false;
      clearOpenedChatStopTimeout();
      return;
    }

    if (lastOpenedChatUserIdRef.current === selectedChatUserId) {
      return;
    }

    lastOpenedChatUserIdRef.current = selectedChatUserId;
    lastOwnDialogMessageKeyRef.current = lastOwnDialogMessageKey;
    shouldOpenChatAtBottomRef.current = true;
    clearOpenedChatStopTimeout();
    scrollMessagesListToBottom(messagesListRef, bottomAnchorRef);
  }, [activeView, bottomAnchorRef, lastOwnDialogMessageKey, messagesListRef, selectedChatUserId]);

  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      return;
    }

    const messagesList = messagesListRef.current;

    if (!messagesList) {
      return;
    }

    const stopKeepingOpenedChatAtBottom = () => {
      shouldOpenChatAtBottomRef.current = false;
      clearOpenedChatStopTimeout();
    };

    messagesList.addEventListener("wheel", stopKeepingOpenedChatAtBottom, { passive: true });
    messagesList.addEventListener("touchmove", stopKeepingOpenedChatAtBottom, { passive: true });
    messagesList.addEventListener("pointerdown", stopKeepingOpenedChatAtBottom);
    messagesList.addEventListener("keydown", stopKeepingOpenedChatAtBottom);

    return () => {
      messagesList.removeEventListener("wheel", stopKeepingOpenedChatAtBottom);
      messagesList.removeEventListener("touchmove", stopKeepingOpenedChatAtBottom);
      messagesList.removeEventListener("pointerdown", stopKeepingOpenedChatAtBottom);
      messagesList.removeEventListener("keydown", stopKeepingOpenedChatAtBottom);
    };
  }, [activeView, messagesListRef, selectedChatUserId]);

  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      return;
    }

    const messagesList = messagesListRef.current;

    if (!messagesList || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (shouldOpenChatAtBottomRef.current) {
        scrollMessagesListToBottom(messagesListRef, bottomAnchorRef);
      }
    });

    observer.observe(messagesList);

    return () => {
      observer.disconnect();
    };
  }, [activeView, bottomAnchorRef, messagesListRef, selectedChatUserId]);

  useLayoutEffect(() => {
    if (
      activeView !== "messages" ||
      selectedChatUserId === null ||
      isLoadingMessages ||
      !shouldOpenChatAtBottomRef.current
    ) {
      return;
    }

    const frameIds: number[] = [];

    function scroll() {
      if (shouldOpenChatAtBottomRef.current) {
        scrollMessagesListToBottom(messagesListRef, bottomAnchorRef);
      }
    }

    clearOpenedChatStopTimeout();
    scroll();
    frameIds.push(window.requestAnimationFrame(scroll));
    frameIds.push(
      window.requestAnimationFrame(() => {
        frameIds.push(
          window.requestAnimationFrame(() => {
            scroll();
            clearOpenedChatStopTimeout();
            openedChatStopTimeoutRef.current = window.setTimeout(() => {
              shouldOpenChatAtBottomRef.current = false;
              openedChatStopTimeoutRef.current = null;
            }, 900);
          }),
        );
      }),
    );

    return () => {
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    };
  }, [
    activeDialogMessagesCount,
    activeDialogMessagesKey,
    activeView,
    bottomAnchorRef,
    isLoadingMessages,
    messagesListRef,
    selectedChatUserId,
  ]);

  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      lastOpenedChatUserIdRef.current = null;
      lastOwnDialogMessageKeyRef.current = "";
      shouldOpenChatAtBottomRef.current = false;
      clearOpenedChatStopTimeout();
    }
  }, [activeView, selectedChatUserId]);

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

    scrollMessagesListToBottom(messagesListRef, bottomAnchorRef);
    const frameIds: number[] = [];

    frameIds.push(
      window.requestAnimationFrame(() => {
        scrollMessagesListToBottom(messagesListRef, bottomAnchorRef);
      }),
    );
    frameIds.push(
      window.requestAnimationFrame(() => {
        frameIds.push(
          window.requestAnimationFrame(() => {
            scrollMessagesListToBottom(messagesListRef, bottomAnchorRef);
          }),
        );
      }),
    );

    return () => {
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    };
  }, [activeView, bottomAnchorRef, lastOwnDialogMessageKey, messagesListRef, selectedChatUserId]);

  useLayoutEffect(() => {
    if (activeView !== "favorites") {
      return;
    }

    scrollMessagesListToBottom(messagesListRef, bottomAnchorRef);
  }, [activeView, bottomAnchorRef, favoriteItemsCount, favoriteItemsKey, messagesListRef]);

  useEffect(() => {
    const timeoutRef = highlightedMessageTimeoutRef;

    return () => {
      const highlightedMessageTimeoutId = timeoutRef.current;

      if (highlightedMessageTimeoutId !== null) {
        window.clearTimeout(highlightedMessageTimeoutId);
      }

      clearOpenedChatStopTimeout();
    };
  }, [highlightedMessageTimeoutRef]);
}
