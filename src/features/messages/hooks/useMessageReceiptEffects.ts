import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { ActiveView, MessageReceiptStatus, MessageRow } from "@/shared/types";
import { isServiceMessage } from "@/shared/utils/messages";

type UseMessageReceiptEffectsParams = {
  activeView: ActiveView;
  isDialogLoading: boolean;
  messagesListRef: RefObject<HTMLDivElement | null>;
  selectedChatUserId: string | null;
  sendMessageReceipt: (
    message: MessageRow,
    status: MessageReceiptStatus,
  ) => void | Promise<void>;
  sendMessageReceipts: (
    messages: MessageRow[],
    status: MessageReceiptStatus,
  ) => void | Promise<void>;
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
  isDialogLoading,
  messagesListRef,
  selectedChatUserId,
  sendMessageReceipt,
  sendMessageReceipts,
  sentReceiptMessageIdSets,
  userId,
  visibleMessages,
}: UseMessageReceiptEffectsParams) {
  const openedChatUserIdRef = useRef<string | null>(null);
  const pendingOpenReadChatUserIdRef = useRef<string | null>(null);
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
        void sendMessageReceipt(message, "delivered");
      }
    }

    if (activeView !== "messages" || selectedChatUserId === null) {
      openedChatUserIdRef.current = null;
      pendingOpenReadChatUserIdRef.current = null;
      return;
    }

    if (openedChatUserIdRef.current !== selectedChatUserId) {
      openedChatUserIdRef.current = selectedChatUserId;
      pendingOpenReadChatUserIdRef.current = selectedChatUserId;
    }

    const friendMessagesById = new Map(
      friendMessages
        .filter((message) => message.user_id === selectedChatUserId)
        .map((message) => [message.id, message]),
    );

    function markMessagesAsRead(messagesToRead: MessageRow[]) {
      const unreadMessages = [];

      for (const message of messagesToRead) {
        if (
          sentReceiptMessageIdSets.readMessageIds.has(message.id) ||
          sentReadReceiptIdsRef.current.has(message.id)
        ) {
          continue;
        }

        sentReadReceiptIdsRef.current.add(message.id);
        unreadMessages.push(message);
      }

      if (unreadMessages.length > 0) {
        void sendMessageReceipts(unreadMessages, "read");
      }
    }

    if (
      !isDialogLoading &&
      pendingOpenReadChatUserIdRef.current === selectedChatUserId
    ) {
      markMessagesAsRead(Array.from(friendMessagesById.values()));
      pendingOpenReadChatUserIdRef.current = null;
    }

    const messagesList = messagesListRef.current;

    if (!messagesList || typeof IntersectionObserver === "undefined") {
      return;
    }

    const friendUnreadMessages = Array.from(friendMessagesById.values()).filter((message) => {
      return (
        !sentReceiptMessageIdSets.readMessageIds.has(message.id) &&
        !sentReadReceiptIdsRef.current.has(message.id)
      );
    });

    if (friendUnreadMessages.length === 0) {
      return;
    }

    const friendUnreadMessageIds = new Set(friendUnreadMessages.map((m) => m.id));

    const observer = new IntersectionObserver(
      (entries) => {
        if (document.visibilityState !== "visible") {
          return;
        }

        const messagesToRead: MessageRow[] = [];
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const messageId = Number((entry.target as HTMLElement).dataset.messageId);
            if (Number.isInteger(messageId) && friendUnreadMessageIds.has(messageId)) {
              const message = friendMessagesById.get(messageId);
              if (message) {
                messagesToRead.push(message);
                observer.unobserve(entry.target);
              }
            }
          }
        }

        if (messagesToRead.length > 0) {
          markMessagesAsRead(messagesToRead);
        }
      },
      {
        root: messagesList,
        rootMargin: "-8px 0px",
        threshold: 0,
      }
    );

    const messageElements = messagesList.querySelectorAll<HTMLElement>("[data-message-id]");
    for (const el of messageElements) {
      const messageId = Number(el.dataset.messageId);
      if (Number.isInteger(messageId) && friendUnreadMessageIds.has(messageId)) {
        observer.observe(el);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        for (const el of messageElements) {
          const messageId = Number(el.dataset.messageId);
          if (Number.isInteger(messageId) && friendUnreadMessageIds.has(messageId)) {
            observer.observe(el);
          }
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    activeView,
    isDialogLoading,
    messagesListRef,
    selectedChatUserId,
    sendMessageReceipt,
    sendMessageReceipts,
    sentReceiptMessageIdSets,
    userId,
    visibleMessages,
  ]);
}
