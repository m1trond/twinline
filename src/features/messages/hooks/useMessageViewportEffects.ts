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
    let wasUserScrollDetected = false;
    const messagesList = messagesListRef.current;
    const frameIds: number[] = [];
    const timeoutIds: number[] = [];

    const markUserScroll = () => {
      wasUserScrollDetected = true;
    };

    const scroll = () => {
      if (!wasUserScrollDetected) {
        scrollMessagesListToBottom(messagesListRef);
      }
    };

    messagesList?.addEventListener("wheel", markUserScroll, { passive: true });
    messagesList?.addEventListener("touchmove", markUserScroll, { passive: true });
    messagesList?.addEventListener("pointerdown", markUserScroll);
    messagesList?.addEventListener("keydown", markUserScroll);

    scroll();
    frameIds.push(
      window.requestAnimationFrame(() => {
        scroll();
        frameIds.push(window.requestAnimationFrame(scroll));
      }),
    );
    timeoutIds.push(
      window.setTimeout(scroll, 80),
      window.setTimeout(scroll, 180),
    );

    return () => {
      messagesList?.removeEventListener("wheel", markUserScroll);
      messagesList?.removeEventListener("touchmove", markUserScroll);
      messagesList?.removeEventListener("pointerdown", markUserScroll);
      messagesList?.removeEventListener("keydown", markUserScroll);
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
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
