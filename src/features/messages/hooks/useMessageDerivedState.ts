import { useMemo } from "react";
import type {
  MessagePinRow,
  MessageReceiptRow,
  MessageRow,
  MessageTypingStateRow,
  PinMessagePayload,
} from "@/shared/types";
import {
  getPinMessagePayload,
  getReceiptMessagePayload,
  getTypingMessagePayload,
  isDirectMessageForUser,
  isServiceMessage,
} from "@/shared/utils/messages";
import { useTypingClock } from "@/features/messages/hooks/useTypingClock";

type UseMessageDerivedStateParams = {
  hasLoadedMessageReceipts: boolean;
  hiddenMessageIdSet: Set<number>;
  messagePins: MessagePinRow[];
  messageReceipts: MessageReceiptRow[];
  messages: MessageRow[];
  messageTypingStates: MessageTypingStateRow[];
  selectedChatUserId: string | null;
  userId: string | null | undefined;
};

const timestampCache = new Map<string, number>();
function getMessageTimestamp(dateStr: string): number {
  if (timestampCache.has(dateStr)) {
    return timestampCache.get(dateStr)!;
  }
  const t = new Date(dateStr).getTime();
  if (timestampCache.size > 5000) {
    const firstKey = timestampCache.keys().next().value;
    if (firstKey !== undefined) {
      timestampCache.delete(firstKey);
    }
  }
  timestampCache.set(dateStr, t);
  return t;
}

export function useMessageDerivedState({
  hasLoadedMessageReceipts,
  hiddenMessageIdSet,
  messagePins,
  messageReceipts,
  messages,
  messageTypingStates,
  selectedChatUserId,
  userId,
}: UseMessageDerivedStateParams) {
  const sharedPinnedMessageIds = useMemo(() => {
    const legacyPinnedIds = new Map<number, PinMessagePayload["action"]>();
    const tablePinnedIds = new Map<number, boolean>();

    for (const message of messages) {
      const pinPayload = getPinMessagePayload(message.text);

      if (pinPayload) {
        legacyPinnedIds.set(pinPayload.messageId, pinPayload.action);
      }
    }

    for (const pin of messagePins) {
      tablePinnedIds.set(pin.message_id, pin.is_pinned);
    }

    for (const [messageId, action] of legacyPinnedIds) {
      if (!tablePinnedIds.has(messageId)) {
        tablePinnedIds.set(messageId, action === "pin");
      }
    }

    return new Set(
      Array.from(tablePinnedIds.entries())
        .filter(([, isPinned]) => isPinned)
        .map(([messageId]) => messageId),
    );
  }, [messagePins, messages]);

  const sharedPinnedMessageIdSet = useMemo(() => {
    return new Set(sharedPinnedMessageIds);
  }, [sharedPinnedMessageIds]);

  const messageReceiptStatuses = useMemo(() => {
    const statuses = new Map<number, "delivered" | "read">();

    for (const receipt of messageReceipts) {
      if (
        receipt.recipient_id !== userId ||
        receipt.status === "played"
      ) {
        continue;
      }

      const currentStatus = statuses.get(receipt.message_id);

      if (receipt.status === "read" || currentStatus !== "read") {
        statuses.set(receipt.message_id, receipt.status);
      }
    }

    for (const message of messages) {
      const receiptPayload = getReceiptMessagePayload(message.text);

      if (
        !receiptPayload ||
        receiptPayload.status === "played" ||
        message.user_id === userId
      ) {
        continue;
      }

      const currentStatus = statuses.get(receiptPayload.messageId);

      if (receiptPayload.status === "read" || currentStatus !== "read") {
        statuses.set(receiptPayload.messageId, receiptPayload.status);
      }
    }

    return statuses;
  }, [messageReceipts, messages, userId]);

  const sentReceiptMessageIdSets = useMemo(() => {
    const deliveredMessageIds = new Set<number>();
    const playedMessageIds = new Set<number>();
    const readMessageIds = new Set<number>();

    if (!userId) {
      return { deliveredMessageIds, playedMessageIds, readMessageIds };
    }

    for (const receipt of messageReceipts) {
      if (receipt.sender_id !== userId) {
        continue;
      }

      if (receipt.status === "delivered" || receipt.status === "read") {
        deliveredMessageIds.add(receipt.message_id);
      }

      if (receipt.status === "played") {
        playedMessageIds.add(receipt.message_id);
      }

      if (receipt.status === "read") {
        readMessageIds.add(receipt.message_id);
      }
    }

    for (const message of messages) {
      const receiptPayload = getReceiptMessagePayload(message.text);

      if (!receiptPayload || message.user_id !== userId) {
        continue;
      }

      if (receiptPayload.status === "delivered" || receiptPayload.status === "read") {
        deliveredMessageIds.add(receiptPayload.messageId);
      }

      if (receiptPayload.status === "played") {
        playedMessageIds.add(receiptPayload.messageId);
      }

      if (receiptPayload.status === "read") {
        readMessageIds.add(receiptPayload.messageId);
      }
    }

    return { deliveredMessageIds, playedMessageIds, readMessageIds };
  }, [messageReceipts, messages, userId]);

  const playedVoiceMessageIds = useMemo(() => {
    if (!userId) {
      return new Set<number>();
    }

    const playedMessageIds = new Set<number>();

    for (const receipt of messageReceipts) {
      if (receipt.status === "played") {
        playedMessageIds.add(receipt.message_id);
      }
    }

    for (const message of messages) {
      const receiptPayload = getReceiptMessagePayload(message.text);

      if (receiptPayload?.status === "played") {
        playedMessageIds.add(receiptPayload.messageId);
      }
    }

    return playedMessageIds;
  }, [messageReceipts, messages, userId]);

  const incomingUnreadMessageIds = useMemo(() => {
    if (!userId || !hasLoadedMessageReceipts) {
      return new Set<number>();
    }

    const readMessageIds = new Set<number>();

    for (const receipt of messageReceipts) {
      if (receipt.sender_id === userId && receipt.status === "read") {
        readMessageIds.add(receipt.message_id);
      }
    }

    for (const message of messages) {
      const receiptPayload = getReceiptMessagePayload(message.text);

      if (
        message.user_id === userId &&
        receiptPayload?.status === "read"
      ) {
        readMessageIds.add(receiptPayload.messageId);
      }
    }

    return new Set(
      messages
        .filter((message) => {
          return (
            message.id > 0 &&
            message.user_id &&
            isDirectMessageForUser(message, userId) &&
            message.user_id !== userId &&
            !hiddenMessageIdSet.has(message.id) &&
            !isServiceMessage(message.text) &&
            !readMessageIds.has(message.id)
          );
        })
        .map((message) => message.id),
    );
  }, [hasLoadedMessageReceipts, hiddenMessageIdSet, messageReceipts, messages, userId]);

  const unreadMessageCountFromReceipts = incomingUnreadMessageIds.size;
  const totalUnreadMessageCount = unreadMessageCountFromReceipts;

  const friendTypingUntil = useMemo(() => {
    if (!userId || !selectedChatUserId) {
      return 0;
    }

    const currentChatMessages = messages.filter(
      (m) =>
        (m.user_id === selectedChatUserId && m.recipient_id === userId) ||
        (m.user_id === userId && m.recipient_id === selectedChatUserId)
    );

    const latestFriendRealMessageCreatedAt = currentChatMessages.reduce((latestCreatedAt, message) => {
      if (
        message.user_id !== selectedChatUserId ||
        message.recipient_id !== userId ||
        isServiceMessage(message.text)
      ) {
        return latestCreatedAt;
      }

      return Math.max(latestCreatedAt, getMessageTimestamp(message.created_at));
    }, 0);

    const tableTypingState = messageTypingStates
      .filter((typingState) => {
        return (
          typingState.sender_id === selectedChatUserId &&
          typingState.recipient_id === userId
        );
      })
      .sort(
        (firstState, secondState) =>
          getMessageTimestamp(secondState.event_at) -
          getMessageTimestamp(firstState.event_at),
      )[0];

    if (tableTypingState) {
      const typingEventAt = getMessageTimestamp(tableTypingState.event_at);
      const typingExpiresAt = getMessageTimestamp(tableTypingState.expires_at);

      if (
        tableTypingState.action === "start" &&
        typingEventAt > latestFriendRealMessageCreatedAt
      ) {
        return typingExpiresAt;
      }
    }

    let latestFriendTypingCreatedAt = 0;
    let latestFriendTypingExpiresAt = 0;

    for (const message of currentChatMessages) {
      if (
        message.user_id !== selectedChatUserId ||
        message.recipient_id !== userId
      ) {
        continue;
      }

      const createdAt = getMessageTimestamp(message.created_at);
      const typingPayload = getTypingMessagePayload(message.text);

      if (typingPayload) {
        if (createdAt >= latestFriendTypingCreatedAt) {
          latestFriendTypingCreatedAt = createdAt;
          latestFriendTypingExpiresAt =
            typingPayload.action === "stop"
              ? 0
              : createdAt + 4500;
        }
      }
    }

    if (
      !latestFriendTypingExpiresAt ||
      latestFriendTypingCreatedAt <= latestFriendRealMessageCreatedAt
    ) {
      return 0;
    }

    return latestFriendTypingExpiresAt;
  }, [messageTypingStates, messages, selectedChatUserId, userId]);
  const typingNow = useTypingClock(friendTypingUntil);
  const isFriendTyping = friendTypingUntil > typingNow;

  return {
    incomingUnreadMessageIds,
    isFriendTyping,
    messageReceiptStatuses,
    playedVoiceMessageIds,
    sentReceiptMessageIdSets,
    sharedPinnedMessageIds,
    sharedPinnedMessageIdSet,
    totalUnreadMessageCount,
  };
}
