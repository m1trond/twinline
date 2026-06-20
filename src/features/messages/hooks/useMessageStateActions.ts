import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  upsertMessageReceipt,
  upsertMessageTypingState,
} from "@/features/messages/queries";
import type {
  MessageReceiptRow,
  MessageReceiptStatus,
  MessageRow,
  MessageTypingStateRow,
} from "@/shared/types";
import {
  createReceiptMessageText,
  createTypingMessageText,
} from "@/shared/utils/messages";

type UseMessageStateActionsParams = {
  activeUserName: string;
  broadcastReceipt: (receipt: MessageReceiptRow) => void;
  broadcastTypingState: (typingState: MessageTypingStateRow) => void;
  selectedChatUserId: string | null;
  sendLegacyServiceMessage: (text: string, recipientId?: string | null) => void | Promise<void>;
  setMessageReceipts: Dispatch<SetStateAction<MessageReceiptRow[]>>;
  setMessageTypingStates: Dispatch<SetStateAction<MessageTypingStateRow[]>>;
  user: User | null;
};

function mergeMessageReceipts(
  currentRows: MessageReceiptRow[],
  incomingRows: MessageReceiptRow[],
) {
  const rowsByKey = new Map<string, MessageReceiptRow>();

  for (const row of currentRows) {
    rowsByKey.set(`${row.message_id}:${row.sender_id}:${row.status}`, row);
  }

  for (const row of incomingRows) {
    rowsByKey.set(`${row.message_id}:${row.sender_id}:${row.status}`, row);
  }

  return Array.from(rowsByKey.values());
}

function mergeMessageTypingStates(
  currentRows: MessageTypingStateRow[],
  incomingRows: MessageTypingStateRow[],
) {
  const rowsByKey = new Map<string, MessageTypingStateRow>();

  for (const row of currentRows) {
    rowsByKey.set(`${row.sender_id}:${row.recipient_id}`, row);
  }

  for (const row of incomingRows) {
    rowsByKey.set(`${row.sender_id}:${row.recipient_id}`, row);
  }

  return Array.from(rowsByKey.values());
}

export function useMessageStateActions({
  activeUserName,
  broadcastReceipt,
  broadcastTypingState,
  selectedChatUserId,
  sendLegacyServiceMessage,
  setMessageReceipts,
  setMessageTypingStates,
  user,
}: UseMessageStateActionsParams) {
  const sendMessageReceipt = useCallback(
    async (message: MessageRow, status: MessageReceiptStatus) => {
      if (!user || !message.user_id || message.id <= 0 || message.user_id === user.id) {
        return;
      }

      const optimisticReceipt: MessageReceiptRow = {
        created_at: new Date().toISOString(),
        id: -Date.now(),
        message_id: message.id,
        recipient_id: message.user_id,
        sender_id: user.id,
        status,
      };

      setMessageReceipts((currentRows) =>
        mergeMessageReceipts(currentRows, [optimisticReceipt]),
      );

      const { data, error } = await upsertMessageReceipt(
        message.id,
        user.id,
        message.user_id,
        status,
      );

      if (error || !data) {
        void sendLegacyServiceMessage(
          createReceiptMessageText(message.id, status),
          message.user_id,
        );
        return;
      }

      setMessageReceipts((currentRows) =>
        mergeMessageReceipts(
          currentRows.filter((receipt) => receipt.id !== optimisticReceipt.id),
          [data],
        ),
      );
      broadcastReceipt(data);
    },
    [broadcastReceipt, sendLegacyServiceMessage, setMessageReceipts, user],
  );

  const sendTypingState = useCallback(
    async (action: "start" | "stop") => {
      if (!user || !selectedChatUserId) {
        return;
      }

      const eventAt = new Date().toISOString();
      const eventTime = new Date(eventAt).getTime();

      const optimisticTypingState: MessageTypingStateRow = {
        action,
        event_at: eventAt,
        expires_at: new Date(
          action === "start" ? eventTime + 4500 : eventTime,
        ).toISOString(),
        recipient_id: selectedChatUserId,
        sender_id: user.id,
      };

      setMessageTypingStates((currentRows) =>
        mergeMessageTypingStates(currentRows, [optimisticTypingState]),
      );
      broadcastTypingState(optimisticTypingState);

      const { data, error } = await upsertMessageTypingState(
        user.id,
        selectedChatUserId,
        action,
        eventAt,
      );

      if (error || !data) {
        const fallbackResponse = await supabase.from("messages").insert({
          author: activeUserName,
          recipient_id: selectedChatUserId,
          text: createTypingMessageText(action, eventAt),
          user_id: user.id,
        });

        if (fallbackResponse.error) {
          console.error("Hush typing state failed:", fallbackResponse.error.message);
        }
        return;
      }

      setMessageTypingStates((currentRows) =>
        mergeMessageTypingStates(currentRows, [data]),
      );
      broadcastTypingState(data);
    },
    [
      activeUserName,
      broadcastTypingState,
      selectedChatUserId,
      setMessageTypingStates,
      user,
    ],
  );

  return {
    sendMessageReceipt,
    sendTypingState,
  };
}
