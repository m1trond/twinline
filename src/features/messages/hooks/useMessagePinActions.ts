import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import { upsertMessagePin } from "@/features/messages/queries";
import type {
  MessagePinRow,
  MessageRow,
  PinnedMessageIdsByChat,
} from "@/shared/types";
import { createPinMessageText } from "@/shared/utils/messages";

type UseMessagePinActionsParams = {
  activePinnedMessageIdSet: Set<number>;
  activePinnedMessages: MessageRow[];
  broadcastPin: (pin: MessagePinRow) => void;
  messagePinTarget: MessageRow | null;
  pinnedMessageIdsByChat: PinnedMessageIdsByChat;
  savePinnedMessageIdsByChat: (nextPinnedMessageIdsByChat: PinnedMessageIdsByChat) => void;
  selectedChatUserId: string | null;
  sendLegacyServiceMessage: (text: string, recipientId?: string | null) => void | Promise<void>;
  setErrorMessage: (message: string) => void;
  setIsPinnedMessagesViewOpen: (isOpen: boolean) => void;
  setIsUnpinAllDialogOpen: (isOpen: boolean) => void;
  setMessageContextMenu: (contextMenu: null) => void;
  setMessagePins: Dispatch<SetStateAction<MessagePinRow[]>>;
  setMessagePinTarget: (message: MessageRow | null) => void;
  setShouldPinForBoth: (shouldPin: boolean) => void;
  sharedPinnedMessageIds: Set<number>;
  shouldPinForBoth: boolean;
  user: User | null;
};

function mergeMessagePins(currentRows: MessagePinRow[], incomingRows: MessagePinRow[]) {
  const rowsByKey = new Map<string, MessagePinRow>();

  for (const row of currentRows) {
    rowsByKey.set(`${row.message_id}:${row.pinner_id}:${row.recipient_id}`, row);
  }

  for (const row of incomingRows) {
    rowsByKey.set(`${row.message_id}:${row.pinner_id}:${row.recipient_id}`, row);
  }

  return Array.from(rowsByKey.values());
}

export function useMessagePinActions({
  activePinnedMessageIdSet,
  activePinnedMessages,
  broadcastPin,
  messagePinTarget,
  pinnedMessageIdsByChat,
  savePinnedMessageIdsByChat,
  selectedChatUserId,
  sendLegacyServiceMessage,
  setErrorMessage,
  setIsPinnedMessagesViewOpen,
  setIsUnpinAllDialogOpen,
  setMessageContextMenu,
  setMessagePins,
  setMessagePinTarget,
  setShouldPinForBoth,
  sharedPinnedMessageIds,
  shouldPinForBoth,
  user,
}: UseMessagePinActionsParams) {
  const requestPinnedMessage = useCallback(
    (message: MessageRow) => {
      setMessagePinTarget(message);
      setShouldPinForBoth(false);
      setMessageContextMenu(null);
      setErrorMessage("");
    },
    [setErrorMessage, setMessageContextMenu, setMessagePinTarget, setShouldPinForBoth],
  );

  const removeLocalPinnedMessageId = useCallback(
    (messageId: number, chatUserId = selectedChatUserId) => {
      if (!user || !chatUserId) {
        return;
      }

      const currentPinnedIds = pinnedMessageIdsByChat[chatUserId] ?? [];

      if (!currentPinnedIds.includes(messageId)) {
        return;
      }

      const nextPinnedMessageIdsByChat = {
        ...pinnedMessageIdsByChat,
        [chatUserId]: currentPinnedIds.filter((pinnedMessageId) => pinnedMessageId !== messageId),
      };

      savePinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
    },
    [pinnedMessageIdsByChat, savePinnedMessageIdsByChat, selectedChatUserId, user],
  );

  const requestUnpinPinnedMessage = useCallback(
    (message: MessageRow) => {
      setMessagePinTarget(message);
      setShouldPinForBoth(sharedPinnedMessageIds.has(message.id));
      setMessageContextMenu(null);
      setErrorMessage("");
    },
    [
      setErrorMessage,
      setMessageContextMenu,
      setMessagePinTarget,
      setShouldPinForBoth,
      sharedPinnedMessageIds,
    ],
  );

  const confirmPinnedMessage = useCallback(async () => {
    if (!messagePinTarget) {
      return;
    }

    const isSharedPinned = sharedPinnedMessageIds.has(messagePinTarget.id);
    const isPinned = activePinnedMessageIdSet.has(messagePinTarget.id);

    if (!shouldPinForBoth) {
      if (!user || !selectedChatUserId) {
        setErrorMessage("Сначала открой нужный чат.");
        return;
      }

      const currentPinnedIds = pinnedMessageIdsByChat[selectedChatUserId] ?? [];
      const nextPinnedIds = isPinned
        ? currentPinnedIds.filter((messageId) => messageId !== messagePinTarget.id)
        : [...currentPinnedIds, messagePinTarget.id];
      const nextPinnedMessageIdsByChat = {
        ...pinnedMessageIdsByChat,
        [selectedChatUserId]: Array.from(new Set(nextPinnedIds)),
      };

      savePinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
      setMessagePinTarget(null);
      setErrorMessage("");
      return;
    }

    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    if (!selectedChatUserId) {
      setErrorMessage("Сначала открой нужный чат.");
      return;
    }

    const action: "pin" | "unpin" = isSharedPinned ? "unpin" : "pin";
    const now = new Date().toISOString();
    const optimisticPin: MessagePinRow = {
      created_at: now,
      is_pinned: action === "pin",
      message_id: messagePinTarget.id,
      pinner_id: user.id,
      recipient_id: selectedChatUserId,
      updated_at: now,
    };

    setMessagePinTarget(null);
    setMessagePins((currentRows) => mergeMessagePins(currentRows, [optimisticPin]));
    broadcastPin(optimisticPin);

    const { data, error } = await upsertMessagePin(
      messagePinTarget.id,
      user.id,
      selectedChatUserId,
      action === "pin",
    );

    if (error || !data) {
      const fallbackText = createPinMessageText(messagePinTarget.id, action);
      void sendLegacyServiceMessage(fallbackText, selectedChatUserId);
      setErrorMessage("Не получилось сохранить закрепление в новой таблице. Использовал совместимый режим.");
      return;
    }

    setMessagePins((currentRows) => mergeMessagePins(currentRows, [data]));
    broadcastPin(data);
    setErrorMessage("");
  }, [
    activePinnedMessageIdSet,
    broadcastPin,
    messagePinTarget,
    pinnedMessageIdsByChat,
    savePinnedMessageIdsByChat,
    selectedChatUserId,
    sendLegacyServiceMessage,
    setErrorMessage,
    setMessagePins,
    setMessagePinTarget,
    sharedPinnedMessageIds,
    shouldPinForBoth,
    user,
  ]);

  const confirmUnpinPinnedMessage = useCallback(async () => {
    if (!messagePinTarget) {
      return;
    }

    const wasSharedPinned = sharedPinnedMessageIds.has(messagePinTarget.id);
    const wasLocalPinned =
      selectedChatUserId !== null &&
      (pinnedMessageIdsByChat[selectedChatUserId] ?? []).includes(messagePinTarget.id);

    if (wasLocalPinned && user && selectedChatUserId) {
      const nextPinnedMessageIdsByChat = {
        ...pinnedMessageIdsByChat,
        [selectedChatUserId]: (pinnedMessageIdsByChat[selectedChatUserId] ?? []).filter(
          (messageId) => messageId !== messagePinTarget.id,
        ),
      };

      savePinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
    }

    if (wasSharedPinned) {
      setShouldPinForBoth(true);
      await confirmPinnedMessage();
      return;
    }

    setMessagePinTarget(null);
    setErrorMessage("");
  }, [
    confirmPinnedMessage,
    messagePinTarget,
    pinnedMessageIdsByChat,
    savePinnedMessageIdsByChat,
    selectedChatUserId,
    setErrorMessage,
    setMessagePinTarget,
    setShouldPinForBoth,
    sharedPinnedMessageIds,
    user,
  ]);

  const unpinAllActivePinnedMessages = useCallback(async () => {
    if (!user || !selectedChatUserId || activePinnedMessages.length === 0) {
      return;
    }

    setIsUnpinAllDialogOpen(false);

    const previousPinnedMessageIdsByChat = pinnedMessageIdsByChat;
    const sharedPinnedIds = activePinnedMessages
      .filter((message) => sharedPinnedMessageIds.has(message.id))
      .map((message) => message.id);
    const nextPinnedMessageIdsByChat = {
      ...pinnedMessageIdsByChat,
      [selectedChatUserId]: [],
    };

    savePinnedMessageIdsByChat(nextPinnedMessageIdsByChat);

    if (sharedPinnedIds.length === 0) {
      setIsPinnedMessagesViewOpen(false);
      setErrorMessage("");
      return;
    }

    const now = new Date().toISOString();
    const optimisticPins = sharedPinnedIds.map((messageId) => ({
      created_at: now,
      is_pinned: false,
      message_id: messageId,
      pinner_id: user.id,
      recipient_id: selectedChatUserId,
      updated_at: now,
    }));

    setMessagePins((currentRows) => mergeMessagePins(currentRows, optimisticPins));
    optimisticPins.forEach((pin) => broadcastPin(pin));

    const pinResponses = await Promise.all(
      sharedPinnedIds.map((messageId) =>
        upsertMessagePin(messageId, user.id, selectedChatUserId, false),
      ),
    );
    const failedResponse = pinResponses.find((response) => response.error || !response.data);

    if (failedResponse) {
      savePinnedMessageIdsByChat(previousPinnedMessageIdsByChat);
      setErrorMessage("Не получилось открепить общие закрепы.");
      return;
    }

    const savedPins = pinResponses
      .map((response) => response.data)
      .filter((pin): pin is MessagePinRow => Boolean(pin));

    setMessagePins((currentRows) => mergeMessagePins(currentRows, savedPins));
    savedPins.forEach((pin) => broadcastPin(pin));
    setIsPinnedMessagesViewOpen(false);
    setErrorMessage("");
  }, [
    activePinnedMessages,
    broadcastPin,
    pinnedMessageIdsByChat,
    savePinnedMessageIdsByChat,
    selectedChatUserId,
    setErrorMessage,
    setIsPinnedMessagesViewOpen,
    setIsUnpinAllDialogOpen,
    setMessagePins,
    sharedPinnedMessageIds,
    user,
  ]);

  return {
    confirmPinnedMessage,
    confirmUnpinPinnedMessage,
    removeLocalPinnedMessageId,
    requestPinnedMessage,
    requestUnpinPinnedMessage,
    unpinAllActivePinnedMessages,
  };
}
