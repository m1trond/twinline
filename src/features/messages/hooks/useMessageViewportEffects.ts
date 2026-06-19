import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { ActiveView } from "@/shared/types";

type MessageViewportEffectsParams = {
  activeView: ActiveView;
  favoriteItemsCount: number;
  favoriteItemsKey: string;
  highlightedMessageTimeoutRef: RefObject<number | null>;
  isLoadingMessages: boolean;
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
  favoriteItemsCount,
  favoriteItemsKey,
  highlightedMessageTimeoutRef,
  isLoadingMessages,
  messagesListRef,
  selectedChatUserId,
}: MessageViewportEffectsParams) {
  const lastOpenedChatUserIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      return;
    }

    if (isLoadingMessages) {
      return;
    }

    if (lastOpenedChatUserIdRef.current === selectedChatUserId) {
      return;
    }

    lastOpenedChatUserIdRef.current = selectedChatUserId;
    scrollMessagesListToBottom(messagesListRef);
  }, [
    activeView,
    isLoadingMessages,
    messagesListRef,
    selectedChatUserId,
  ]);

  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      lastOpenedChatUserIdRef.current = null;
    }
  }, [activeView, selectedChatUserId]);

  useLayoutEffect(() => {
    if (activeView !== "favorites") {
      return;
    }

    scrollMessagesListToBottom(messagesListRef);
  }, [activeView, favoriteItemsCount, favoriteItemsKey, messagesListRef]);

  useEffect(() => {
    const timeoutRef = highlightedMessageTimeoutRef;

    return () => {
      const highlightedMessageTimeoutId = timeoutRef.current;

      if (highlightedMessageTimeoutId !== null) {
        window.clearTimeout(highlightedMessageTimeoutId);
      }
    };
  }, [highlightedMessageTimeoutRef]);
}
