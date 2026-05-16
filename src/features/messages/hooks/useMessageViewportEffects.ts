import { useEffect } from "react";
import type { RefObject } from "react";
import type { ActiveView } from "@/shared/types";

type MessageViewportEffectsParams = {
  activeDialogMessagesCount: number;
  activeView: ActiveView;
  favoriteItemsCount: number;
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

  messagesList.scrollTop = messagesList.scrollHeight;
}

export function useMessageViewportEffects({
  activeDialogMessagesCount,
  activeView,
  favoriteItemsCount,
  highlightedMessageTimeoutRef,
  isLoadingMessages,
  messagesListRef,
  selectedChatUserId,
}: MessageViewportEffectsParams) {
  useEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollMessagesListToBottom(messagesListRef);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    activeDialogMessagesCount,
    activeView,
    isLoadingMessages,
    messagesListRef,
    selectedChatUserId,
  ]);

  useEffect(() => {
    if (activeView !== "favorites") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollMessagesListToBottom(messagesListRef);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeView, favoriteItemsCount, messagesListRef]);

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
