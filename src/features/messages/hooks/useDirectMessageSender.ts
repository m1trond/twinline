import { useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { flushSync } from "react-dom";
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
  messages: MessageRow[];
};

export function useDirectMessageSender({
  activeUserName,
  broadcastMessage,
  selectedChatUserId,
  setErrorMessage,
  setMessages,
  user,
  messages,
}: UseDirectMessageSenderParams) {
  const sendQueueRef = useRef<Promise<any>>(Promise.resolve());
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  return useCallback(
    async (
      text: string,
      { errorMessage, onError, recipientId = selectedChatUserId }: SendDirectMessageOptions,
    ) => {
      if (!user || !recipientId) {
        return null;
      }

      const currentMessages = messagesRef.current;
      let lastMessage: MessageRow | undefined;
      for (let i = currentMessages.length - 1; i >= 0; i--) {
        const m = currentMessages[i];
        if (
          (m.user_id === user.id && m.recipient_id === recipientId) ||
          (m.user_id === recipientId && m.recipient_id === user.id)
        ) {
          lastMessage = m;
          break;
        }
      }
      let optimisticTime = Date.now();
      if (lastMessage) {
        const lastMessageTime = new Date(lastMessage.created_at).getTime();
        if (lastMessageTime >= optimisticTime) {
          optimisticTime = lastMessageTime + 1;
        }
      }

      const optimisticMessage: MessageRow = {
        author: activeUserName,
        client_key: `local-${optimisticTime}-${crypto.randomUUID()}`,
        created_at: new Date(optimisticTime).toISOString(),
        id: -optimisticTime,
        recipient_id: recipientId,
        text,
        user_id: user.id,
      };

      setMessages((prev) => mergeMessages(prev, [optimisticMessage]));

      const committedMessage: MessageRow = optimisticMessage;

      const sendPromise = new Promise<MessageRow | null>((resolve) => {
        sendQueueRef.current = sendQueueRef.current.then(async () => {
          try {
            const { data, error } = await supabase
              .from("messages")
              .insert({
                author: activeUserName,
                recipient_id: recipientId,
                text,
                user_id: user.id,
                created_at: committedMessage.created_at,
              })
              .select(messageColumns)
              .single();

            if (error) {
              setMessages((currentMessages) =>
                currentMessages.filter((message) => message.id !== committedMessage.id),
              );
              onError?.();
              setErrorMessage(errorMessage);
              resolve(null);
              return;
            }

            setMessages((currentMessages) =>
              data
                ? settleOptimisticMessage(currentMessages, committedMessage, data)
                : currentMessages,
            );

            if (data) {
              broadcastMessage(data);
            }

            setErrorMessage("");
            resolve(data ?? null);
          } catch (e) {
            setMessages((currentMessages) =>
              currentMessages.filter((message) => message.id !== committedMessage.id),
            );
            onError?.();
            setErrorMessage(errorMessage);
            resolve(null);
          }
        });
      });

      return sendPromise;
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

