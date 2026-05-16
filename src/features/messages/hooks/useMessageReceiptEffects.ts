import { useEffect, useRef } from "react";
import type { ActiveView, MessageRow } from "@/shared/types";
import { createReceiptMessageText } from "@/shared/utils/messages";

type UseMessageReceiptEffectsParams = {
  activeView: ActiveView;
  selectedChatUserId: string | null;
  sendServiceMessage: (text: string, recipientId?: string | null) => void | Promise<void>;
  sentReceiptMessageIdSets: {
    deliveredMessageIds: Set<number>;
    readMessageIds: Set<number>;
  };
  userId: string | null | undefined;
  visibleMessages: MessageRow[];
};

export function useMessageReceiptEffects({
  activeView,
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
      return message.id > 0 && message.user_id && message.user_id !== userId;
    });

    for (const message of friendMessages) {
      const hasSentDeliveredReceipt =
        sentReceiptMessageIdSets.deliveredMessageIds.has(message.id);
      const hasSentReadReceipt =
        sentReceiptMessageIdSets.readMessageIds.has(message.id);

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

      if (
        activeView === "messages" &&
        selectedChatUserId !== null &&
        message.user_id === selectedChatUserId &&
        document.visibilityState === "visible" &&
        !hasSentReadReceipt &&
        !sentReadReceiptIdsRef.current.has(message.id)
      ) {
        sentReadReceiptIdsRef.current.add(message.id);
        void sendServiceMessage(createReceiptMessageText(message.id, "read"), message.user_id);
      }
    }
  }, [
    activeView,
    selectedChatUserId,
    sendServiceMessage,
    sentReceiptMessageIdSets,
    userId,
    visibleMessages,
  ]);
}
