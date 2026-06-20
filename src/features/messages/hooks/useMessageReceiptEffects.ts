import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { ActiveView, MessageRow } from "@/shared/types";
import { createReceiptMessageText, isServiceMessage } from "@/shared/utils/messages";

type UseMessageReceiptEffectsParams = {
  activeView: ActiveView;
  messagesListRef: RefObject<HTMLDivElement | null>;
  selectedChatUserId: string | null;
  sendServiceMessage: (text: string, recipientId?: string | null) => void | Promise<void>;
  sentReceiptMessageIdSets: {
    deliveredMessageIds: Set<number>;
    playedMessageIds: Set<number>;
    readMessageIds: Set<number>;
  };
  userId: string | null | undefined;
  visibleMessages: MessageRow[];
};

export function useMessageReceiptEffects({
  activeView,
  messagesListRef,
  selectedChatUserId,
  sendServiceMessage,
  sentReceiptMessageIdSets,
  userId,
  visibleMessages,
}: UseMessageReceiptEffectsParams) {
  const sentDeliveryReceiptIdsRef = useRef<Set<number>>(new Set());
  const sentReadReceiptIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!userId) {
      return;
    }

    const friendMessages = visibleMessages.filter((message) => {
      return (
        message.id > 0 &&
        message.user_id &&
        message.user_id !== userId &&
        !isServiceMessage(message.text)
      );
    });

    for (const message of friendMessages) {
      const hasSentDeliveredReceipt =
        sentReceiptMessageIdSets.deliveredMessageIds.has(message.id);

      if (
        message.user_id &&
        !hasSentDeliveredReceipt &&
        !sentDeliveryReceiptIdsRef.current.has(message.id)
      ) {
        sentDeliveryReceiptIdsRef.current.add(message.id);
        void sendServiceMessage(
          createReceiptMessageText(message.id, "delivered"),
          message.user_id,
        );
      }
    }

    if (activeView !== "messages" || selectedChatUserId === null) {
      return;
    }

    let frameId = 0;
    const friendMessagesById = new Map(
      friendMessages
        .filter((message) => message.user_id === selectedChatUserId)
        .map((message) => [message.id, message]),
    );

    function markVisibleMessagesAsRead() {
      if (document.visibilityState !== "visible") {
        return;
      }

      const messagesList = messagesListRef.current;

      if (!messagesList) {
        return;
      }

      const listRect = messagesList.getBoundingClientRect();
      const messageElements =
        messagesList.querySelectorAll<HTMLElement>("[data-message-id]");

      for (const messageElement of messageElements) {
        const messageId = Number(messageElement.dataset.messageId);

        if (!Number.isInteger(messageId)) {
          continue;
        }

        const message = friendMessagesById.get(messageId);

        if (!message?.user_id) {
          continue;
        }

        if (
          sentReceiptMessageIdSets.readMessageIds.has(messageId) ||
          sentReadReceiptIdsRef.current.has(messageId)
        ) {
          continue;
        }

        const messageRect = messageElement.getBoundingClientRect();
        const isVisible =
          messageRect.bottom > listRect.top + 8 &&
          messageRect.top < listRect.bottom - 8;

        if (!isVisible) {
          continue;
        }

        sentReadReceiptIdsRef.current.add(messageId);
        void sendServiceMessage(createReceiptMessageText(messageId, "read"), message.user_id);
      }
    }

    function scheduleReadCheck() {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        markVisibleMessagesAsRead();
      });
    }

    scheduleReadCheck();

    const messagesList = messagesListRef.current;

    messagesList?.addEventListener("scroll", scheduleReadCheck, { passive: true });
    window.addEventListener("resize", scheduleReadCheck);
    document.addEventListener("visibilitychange", scheduleReadCheck);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      messagesList?.removeEventListener("scroll", scheduleReadCheck);
      window.removeEventListener("resize", scheduleReadCheck);
      document.removeEventListener("visibilitychange", scheduleReadCheck);
    };
  }, [
    activeView,
    messagesListRef,
    selectedChatUserId,
    sendServiceMessage,
    sentReceiptMessageIdSets,
    userId,
    visibleMessages,
  ]);
}
