import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { ActiveView } from "@/shared/types";

type MessageViewportEffectsParams = {
  activeView: ActiveView;
  activeDialogMessagesCount: number;
  activeDialogMessagesKey: string;
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
) {
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
  const openedChatBottomTimeoutRef = useRef<number | null>(null);
  const shouldKeepOpenedChatAtBottomRef = useRef(false);

  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      lastOpenedChatUserIdRef.current = null;
      lastOwnDialogMessageKeyRef.current = "";
      shouldKeepOpenedChatAtBottomRef.current = false;
      if (openedChatBottomTimeoutRef.current !== null) {
        window.clearTimeout(openedChatBottomTimeoutRef.current);
        openedChatBottomTimeoutRef.current = null;
      }
      return;
    }

    if (lastOpenedChatUserIdRef.current === selectedChatUserId) {
      return;
    }

    lastOpenedChatUserIdRef.current = selectedChatUserId;
    lastOwnDialogMessageKeyRef.current = lastOwnDialogMessageKey;
    shouldKeepOpenedChatAtBottomRef.current = true;
    if (openedChatBottomTimeoutRef.current !== null) {
      window.clearTimeout(openedChatBottomTimeoutRef.current);
    }
    openedChatBottomTimeoutRef.current = window.setTimeout(() => {
      shouldKeepOpenedChatAtBottomRef.current = false;
      openedChatBottomTimeoutRef.current = null;
    }, 900);
    scrollMessagesListToBottom(messagesListRef);
  }, [activeView, lastOwnDialogMessageKey, messagesListRef, selectedChatUserId]);

  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      return;
    }

    const messagesList = messagesListRef.current;

    if (!messagesList) {
      return;
    }

    const stopKeepingOpenedChatAtBottom = () => {
      shouldKeepOpenedChatAtBottomRef.current = false;
      if (openedChatBottomTimeoutRef.current !== null) {
        window.clearTimeout(openedChatBottomTimeoutRef.current);
        openedChatBottomTimeoutRef.current = null;
      }
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
    if (
      activeView !== "messages" ||
      selectedChatUserId === null ||
      isLoadingMessages ||
      !shouldKeepOpenedChatAtBottomRef.current
    ) {
      return;
    }

    const frameIds: number[] = [];

    function scroll() {
      if (shouldKeepOpenedChatAtBottomRef.current) {
        scrollMessagesListToBottom(messagesListRef);
      }
    }

    scroll();
    frameIds.push(window.requestAnimationFrame(scroll));
    frameIds.push(
      window.requestAnimationFrame(() => {
        frameIds.push(window.requestAnimationFrame(scroll));
      }),
    );

    return () => {
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    };
  }, [
    activeDialogMessagesCount,
    activeDialogMessagesKey,
    activeView,
    isLoadingMessages,
    messagesListRef,
    selectedChatUserId,
  ]);

  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      lastOpenedChatUserIdRef.current = null;
      lastOwnDialogMessageKeyRef.current = "";
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

    scrollMessagesListToBottom(messagesListRef);
    const frameIds: number[] = [];

    frameIds.push(
      window.requestAnimationFrame(() => {
        scrollMessagesListToBottom(messagesListRef);
      }),
    );
    frameIds.push(
      window.requestAnimationFrame(() => {
        frameIds.push(
          window.requestAnimationFrame(() => {
            scrollMessagesListToBottom(messagesListRef);
          }),
        );
      }),
    );

    return () => {
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    };
  }, [activeView, lastOwnDialogMessageKey, messagesListRef, selectedChatUserId]);

  useLayoutEffect(() => {
    if (activeView !== "favorites") {
      return;
    }

    scrollMessagesListToBottom(messagesListRef);
  }, [activeView, favoriteItemsCount, favoriteItemsKey, messagesListRef]);

  useEffect(() => {
    const timeoutRef = highlightedMessageTimeoutRef;

    return () => {
      if (openedChatBottomTimeoutRef.current !== null) {
        window.clearTimeout(openedChatBottomTimeoutRef.current);
        openedChatBottomTimeoutRef.current = null;
      }

      const highlightedMessageTimeoutId = timeoutRef.current;

      if (highlightedMessageTimeoutId !== null) {
        window.clearTimeout(highlightedMessageTimeoutId);
      }
    };
  }, [highlightedMessageTimeoutRef]);
}
