import { useEffect, useLayoutEffect } from "react";
import type { RefObject } from "react";
import type { ActiveView } from "@/shared/types";

type MessageViewportEffectsParams = {
  activeDialogMessagesCount: number;
  activeDialogMessagesKey: string;
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

function keepMessagesListAtBottom(messagesListRef: RefObject<HTMLDivElement | null>) {
  const frameIds: number[] = [];
  const timeoutIds: number[] = [];
  const intervalIds: number[] = [];
  const messagesList = messagesListRef.current;

  const scroll = () => scrollMessagesListToBottom(messagesListRef);

  scroll();

  messagesList?.addEventListener("load", scroll, true);
  messagesList?.addEventListener("loadedmetadata", scroll, true);
  messagesList?.addEventListener("canplay", scroll, true);

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
    window.setTimeout(scroll, 320),
    window.setTimeout(scroll, 600),
    window.setTimeout(scroll, 1000),
  );

  const startedAt = Date.now();
  intervalIds.push(
    window.setInterval(() => {
      if (Date.now() - startedAt > 1200) {
        intervalIds.forEach((intervalId) => window.clearInterval(intervalId));
        return;
      }

      scroll();
    }, 50),
  );

  return () => {
    messagesList?.removeEventListener("load", scroll, true);
    messagesList?.removeEventListener("loadedmetadata", scroll, true);
    messagesList?.removeEventListener("canplay", scroll, true);
    frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    intervalIds.forEach((intervalId) => window.clearInterval(intervalId));
  };
}

export function useMessageViewportEffects({
  activeDialogMessagesCount,
  activeDialogMessagesKey,
  activeView,
  favoriteItemsCount,
  favoriteItemsKey,
  highlightedMessageTimeoutRef,
  isLoadingMessages,
  messagesListRef,
  selectedChatUserId,
}: MessageViewportEffectsParams) {
  useLayoutEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      return;
    }

    if (isLoadingMessages) {
      return;
    }

    return keepMessagesListAtBottom(messagesListRef);
  }, [
    activeDialogMessagesCount,
    activeDialogMessagesKey,
    activeView,
    isLoadingMessages,
    messagesListRef,
    selectedChatUserId,
  ]);

  useLayoutEffect(() => {
    if (activeView !== "favorites") {
      return;
    }

    return keepMessagesListAtBottom(messagesListRef);
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
