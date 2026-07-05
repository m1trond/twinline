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
      return;
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

    const messagesList = messagesListRef.current;

    if (isDialogLoading || !messagesList) {
      return;
    }
    const messagesRoot = messagesList;

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
    let scanFrameId: number | null = null;

    function getVisibleUnreadMessages() {
      const rootRect = messagesRoot.getBoundingClientRect();
      const messagesToRead: MessageRow[] = [];
      const messageElements = messagesRoot.querySelectorAll<HTMLElement>("[data-message-id]");

      for (const el of messageElements) {
        const messageId = Number(el.dataset.messageId);

        if (!Number.isInteger(messageId) || !friendUnreadMessageIds.has(messageId)) {
          continue;
        }

        const message = friendMessagesById.get(messageId);

        if (!message) {
          continue;
        }

        const rect = el.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, rootRect.top);
        const visibleBottom = Math.min(rect.bottom, rootRect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibleRatio = rect.height > 0 ? visibleHeight / rect.height : 0;

        if (visibleRatio >= 0.55) {
          messagesToRead.push(message);
        }
      }

      return messagesToRead;
    }

    function scanVisibleUnreadMessages() {
      scanFrameId = null;
      if (document.visibilityState !== "visible") {
        return;
      }

      const messagesToRead = getVisibleUnreadMessages();
      if (messagesToRead.length > 0) {
        markMessagesAsRead(messagesToRead);
      }
    }

    function scheduleVisibleScan() {
      if (scanFrameId !== null) {
        return;
      }

      scanFrameId = window.requestAnimationFrame(scanVisibleUnreadMessages);
    }

    scheduleVisibleScan();
    const scanTimeoutId = window.setTimeout(scheduleVisibleScan, 120);

    messagesRoot.addEventListener("scroll", scheduleVisibleScan, { passive: true });
    window.addEventListener("resize", scheduleVisibleScan);

    let observer: IntersectionObserver | null = null;

    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
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
                  observer?.unobserve(entry.target);
                }
              }
            }
          }

          if (messagesToRead.length > 0) {
            markMessagesAsRead(messagesToRead);
          }
        },
        {
          root: messagesRoot,
          rootMargin: "-12px 0px -12px 0px",
          threshold: [0.45, 0.6, 0.8],
        },
      );
    }

    const messageElements = messagesRoot.querySelectorAll<HTMLElement>("[data-message-id]");
    for (const el of messageElements) {
      const messageId = Number(el.dataset.messageId);
      if (Number.isInteger(messageId) && friendUnreadMessageIds.has(messageId)) {
        observer?.observe(el);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        scheduleVisibleScan();
        for (const el of messageElements) {
          const messageId = Number(el.dataset.messageId);
          if (Number.isInteger(messageId) && friendUnreadMessageIds.has(messageId)) {
            observer?.observe(el);
          }
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (scanFrameId !== null) {
        window.cancelAnimationFrame(scanFrameId);
      }
      window.clearTimeout(scanTimeoutId);
      messagesRoot.removeEventListener("scroll", scheduleVisibleScan);
      window.removeEventListener("resize", scheduleVisibleScan);
      observer?.disconnect();
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
