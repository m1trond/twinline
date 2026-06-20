import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { messageColumns } from "@/shared/constants";
import type { MessageRow } from "@/shared/types";
import {
  mergeMessages,
  settleOptimisticMessage,
} from "@/shared/utils/messages";

type SendDirectMessageOptions = {
  errorMessage: string;
  onError?: () => void;
  recipientId?: string | null;
};

type UseDirectMessageSenderParams = {
  activeUserName: string;
  broadcastMessage: (message: MessageRow) => void;
  selectedChatUserId: string | null;
  setErrorMessage: (message: string) => void;
  setMessages: Dispatch<SetStateAction<MessageRow[]>>;
  user: User | null;
};

export function useDirectMessageSender({
  activeUserName,
  broadcastMessage,
  selectedChatUserId,
  setErrorMessage,
  setMessages,
  user,
}: UseDirectMessageSenderParams) {
  return useCallback(
    async (
      text: string,
      { errorMessage, onError, recipientId = selectedChatUserId }: SendDirectMessageOptions,
    ) => {
      if (!user || !recipientId) {
        return null;
      }

      const now = Date.now();
      const optimisticMessage: MessageRow = {
        author: activeUserName,
        client_key: `local-${now}-${crypto.randomUUID()}`,
        created_at: new Date(now).toISOString(),
        id: -now,
        recipient_id: recipientId,
        text,
        user_id: user.id,
      };

      setMessages((currentMessages) =>
        mergeMessages(currentMessages, [optimisticMessage]),
      );

      const { data, error } = await supabase
        .from("messages")
        .insert({
          author: activeUserName,
          recipient_id: recipientId,
          text,
          user_id: user.id,
        })
        .select(messageColumns)
        .single();

      if (error) {
        setMessages((currentMessages) =>
          currentMessages.filter((message) => message.id !== optimisticMessage.id),
        );
        onError?.();
        setErrorMessage(errorMessage);
        return null;
      }

      setMessages((currentMessages) =>
        data
          ? settleOptimisticMessage(currentMessages, optimisticMessage, data)
          : currentMessages,
      );

      if (data) {
        broadcastMessage(data);
      }

      setErrorMessage("");
      return data ?? null;
    },
    [
      activeUserName,
      broadcastMessage,
      selectedChatUserId,
      setErrorMessage,
      setMessages,
      user,
    ],
  );
}
