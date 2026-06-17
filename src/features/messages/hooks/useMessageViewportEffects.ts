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

function keepMessagesListAtBottom(messagesListRef: RefObject<HTMLDivElement | null>) {
  const frameIds: number[] = [];
  const timeoutIds: number[] = [];

  const scroll = () => scrollMessagesListToBottom(messagesListRef);

  scroll();

  frameIds.push(
    window.requestAnimationFrame(() => {
      scroll();
      frameIds.push(
        window.requestAnimationFrame(() => {
          scroll();
        }),
      );
    }),
  );

  timeoutIds.push(
    window.setTimeout(scroll, 80),
    window.setTimeout(scroll, 180),
  );

  return () => {
    frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  };
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

    if (isLoadingMessages) {
      return;
    }

    return keepMessagesListAtBottom(messagesListRef);
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

    return keepMessagesListAtBottom(messagesListRef);
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
