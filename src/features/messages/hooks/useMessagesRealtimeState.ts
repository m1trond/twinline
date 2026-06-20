import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  fetchDialogMessages,
  fetchMessages,
  fetchMessagesAfter,
} from "@/features/messages/queries";
import type { ActiveView, MessageRow, MutedProfileUntil } from "@/shared/types";
import { getDisplayName, normalizeUsername } from "@/shared/utils/profile";
import {
  getNotificationMessageText,
  isDirectMessageForUser,
  isServiceMessage,
  mergeMessages,
} from "@/shared/utils/messages";
import { showHushMessageNotification } from "@/shared/utils/notifications";
import { isProfileMuted } from "@/shared/utils/storage";

type UseMessagesRealtimeStateParams = {
  activeViewRef: MutableRefObject<ActiveView>;
  blockedProfileIdsRef: MutableRefObject<Set<string>>;
  isDeletingChatRef: MutableRefObject<boolean>;
  mutedProfilesRef: MutableRefObject<MutedProfileUntil>;
  notificationsEnabledRef: MutableRefObject<boolean>;
  selectedChatUserId: string | null;
  selectedChatUserIdRef: MutableRefObject<string | null>;
  setActiveView: (view: ActiveView) => void;
  setErrorMessage: (message: string) => void;
  setIsLoadingMessages: (isLoading: boolean) => void;
  setSelectedChatUserId: (userId: string | null) => void;
  user: User | null;
};

function areMessagesEqual(firstMessages: MessageRow[], secondMessages: MessageRow[]) {
  if (firstMessages.length !== secondMessages.length) {
    return false;
  }

  return firstMessages.every((firstMessage, messageIndex) => {
    const secondMessage = secondMessages[messageIndex];

    return (
      firstMessage.id === secondMessage.id &&
      firstMessage.author === secondMessage.author &&
      firstMessage.text === secondMessage.text &&
      firstMessage.created_at === secondMessage.created_at &&
      firstMessage.edited_at === secondMessage.edited_at &&
      firstMessage.user_id === secondMessage.user_id &&
      firstMessage.recipient_id === secondMessage.recipient_id
    );
  });
}

function getPendingOptimisticMessages(messages: MessageRow[]) {
  return messages.filter((message) => message.id < 0);
}

function getStoredMessagesKey(userId: string) {
  return `hush-messages-cache-${userId}`;
}

function getLegacyStoredMessagesKey(userId: string) {
  return `twinline-messages-cache-${userId}`;
}

function getStoredMessagesUserKey() {
  return "hush-messages-cache-user";
}

function getLegacyStoredMessagesUserKey() {
  return "twinline-messages-cache-user";
}

function isStoredMessageRow(item: unknown): item is MessageRow {
  if (!item || typeof item !== "object") {
    return false;
  }

  const message = item as MessageRow;

  return (
    Number.isInteger(message.id) &&
    typeof message.author === "string" &&
    typeof message.text === "string" &&
    typeof message.created_at === "string" &&
    (typeof message.edited_at === "string" ||
      message.edited_at === null ||
      typeof message.edited_at === "undefined") &&
    (typeof message.user_id === "string" || message.user_id === null) &&
    (typeof message.recipient_id === "string" || message.recipient_id === null)
  );
}

function readStoredMessages(userId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  const storedMessages =
    window.localStorage.getItem(getStoredMessagesKey(userId)) ??
    window.localStorage.getItem(getLegacyStoredMessagesKey(userId));

  if (!storedMessages) {
    return [];
  }

  window.localStorage.setItem(getStoredMessagesKey(userId), storedMessages);

  try {
    const parsedMessages = JSON.parse(storedMessages);

    return Array.isArray(parsedMessages)
      ? parsedMessages.filter(isStoredMessageRow)
      : [];
  } catch {
    return [];
  }
}

function writeStoredMessages(userId: string, messages: MessageRow[]) {
  const cacheableMessages = messages
    .filter((message) => message.id > 0)
    .slice(-800);

  window.localStorage.setItem(
    getStoredMessagesKey(userId),
    JSON.stringify(cacheableMessages),
  );
  window.localStorage.setItem(getStoredMessagesUserKey(), userId);
}

function readInitialStoredMessages() {
  if (typeof window === "undefined") {
    return [];
  }

  const storedUserId =
    window.localStorage.getItem(getStoredMessagesUserKey()) ??
    window.localStorage.getItem(getLegacyStoredMessagesUserKey());

  if (storedUserId) {
    window.localStorage.setItem(getStoredMessagesUserKey(), storedUserId);
  }

  return storedUserId ? readStoredMessages(storedUserId) : [];
}

export function useMessagesRealtimeState({
  activeViewRef,
  blockedProfileIdsRef,
  isDeletingChatRef,
  mutedProfilesRef,
  notificationsEnabledRef,
  selectedChatUserId,
  selectedChatUserIdRef,
  setActiveView,
  setErrorMessage,
  setIsLoadingMessages,
  setSelectedChatUserId,
  user,
}: UseMessagesRealtimeStateParams) {
  const [messages, setMessages] = useState<MessageRow[]>(readInitialStoredMessages);
  const [loadedDialogUserIds, setLoadedDialogUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const hadSignedInUserRef = useRef(false);
  const messagesRef = useRef<MessageRow[]>(messages);
  const latestMessageCreatedAtRef = useRef<string | null>(null);
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const notifiedMessageIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    messagesRef.current = messages;
    latestMessageCreatedAtRef.current =
      messages.filter((message) => message.id > 0).at(-1)?.created_at ?? null;
  }, [messages]);

  useEffect(() => {
    if (user) {
      hadSignedInUserRef.current = true;
      return;
    }

    if (!hadSignedInUserRef.current) {
      return;
    }

    if (!user) {
      const frameId = window.requestAnimationFrame(() => {
        setMessages([]);
        setLoadedDialogUserIds(new Set());
        latestMessageCreatedAtRef.current = null;
        notifiedMessageIdsRef.current.clear();
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const storedMessages = readStoredMessages(user.id);

      if (storedMessages.length === 0) {
        return;
      }

      setMessages((currentMessages) => {
        const mergedMessages = mergeMessages(storedMessages, currentMessages);

        return areMessagesEqual(currentMessages, mergedMessages)
          ? currentMessages
          : mergedMessages;
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [user]);

  useEffect(() => {
    if (!user || messages.length === 0) {
      return;
    }

    writeStoredMessages(user.id, messages);
  }, [messages, user]);

  useEffect(() => {
    if (!user || !selectedChatUserId) {
      return;
    }

    const signedInUser = user;
    const activeChatUserId = selectedChatUserId;
    let isMounted = true;

    async function syncSelectedDialogMessages() {
      setIsLoadingMessages(true);

      const { data, error } = await fetchDialogMessages(
        signedInUser.id,
        activeChatUserId,
      );

      if (!isMounted || isDeletingChatRef.current) {
        setIsLoadingMessages(false);
        return;
      }

      if (error) {
        setErrorMessage("Не получилось загрузить сообщения.");
      } else {
        setMessages((currentMessages) => {
          const mergedMessages = mergeMessages(
            currentMessages,
            data ?? [],
          );

          return areMessagesEqual(currentMessages, mergedMessages)
            ? currentMessages
            : mergedMessages;
        });
        setErrorMessage("");
      }

      setLoadedDialogUserIds((currentIds) => {
        if (currentIds.has(activeChatUserId)) {
          return currentIds;
        }

        return new Set([...currentIds, activeChatUserId]);
      });
      setIsLoadingMessages(false);
    }

    syncSelectedDialogMessages();

    return () => {
      isMounted = false;
    };
  }, [
    isDeletingChatRef,
    selectedChatUserId,
    setErrorMessage,
    setIsLoadingMessages,
    user,
  ]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const signedInUser = user;
    let isMounted = true;

    async function ensureCurrentProfile() {
      await supabase.from("profiles").upsert(
        {
          bio: null,
          display_name: getDisplayName(signedInUser),
          updated_at: new Date().toISOString(),
          username:
            typeof signedInUser.user_metadata?.username === "string"
              ? normalizeUsername(signedInUser.user_metadata.username)
              : null,
          username_changed_at: null,
          user_id: signedInUser.id,
        },
        {
          onConflict: "user_id",
          ignoreDuplicates: true,
        },
      );
    }

    function handleIncomingNotifications(incomingMessages: MessageRow[]) {
      for (const newMessage of incomingMessages) {
        if (
          newMessage.id <= 0 ||
          !isDirectMessageForUser(newMessage, signedInUser.id) ||
          notifiedMessageIdsRef.current.has(newMessage.id) ||
          isServiceMessage(newMessage.text) ||
          (newMessage.user_id &&
            blockedProfileIdsRef.current.has(newMessage.user_id)) ||
          newMessage.user_id === signedInUser.id
        ) {
          continue;
        }

        notifiedMessageIdsRef.current.add(newMessage.id);

        const isDialogVisible =
          document.visibilityState === "visible" &&
          activeViewRef.current === "messages" &&
          selectedChatUserIdRef.current === newMessage.user_id;

        if (
          !isDialogVisible &&
          notificationsEnabledRef.current &&
          (!newMessage.user_id ||
            !isProfileMuted(mutedProfilesRef.current, newMessage.user_id)) &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const notificationBody = getNotificationMessageText(newMessage.text);
          const notificationTag = `hush-message-${newMessage.id}`;

          void showHushMessageNotification({
            body: notificationBody,
            chatUserId: newMessage.user_id,
            tag: notificationTag,
            title: newMessage.author,
          }).then((wasShownByServiceWorker) => {
            if (wasShownByServiceWorker) {
              return;
            }

            const notification = new Notification(newMessage.author, {
              body: notificationBody,
              tag: notificationTag,
            });

            window.setTimeout(() => {
              notification.close();
            }, 3000);

            notification.onclick = () => {
              window.focus();
              setActiveView("messages");

              if (newMessage.user_id) {
                setSelectedChatUserId(newMessage.user_id);
              }

              notification.close();
            };
          });
        }
      }
    }

    async function syncAllMessages(showLoading = false) {
      if (isDeletingChatRef.current) {
        if (showLoading) {
          setIsLoadingMessages(false);
        }
        return;
      }

      if (showLoading) {
        setIsLoadingMessages(true);
      }

      const { data, error } = await fetchMessages(signedInUser.id);

      if (!isMounted || isDeletingChatRef.current) {
        if (showLoading) {
          setIsLoadingMessages(false);
        }
        return;
      }

      if (error) {
        setErrorMessage("Не получилось загрузить сообщения.");
      } else {
        const nextMessages = data ?? [];

        setMessages((currentMessages) => {
          const mergedMessages = mergeMessages(
            currentMessages,
            [...getPendingOptimisticMessages(currentMessages), ...nextMessages],
          );

          return areMessagesEqual(currentMessages, mergedMessages)
            ? currentMessages
            : mergedMessages;
        });
        setErrorMessage("");
      }

      if (showLoading) {
        setIsLoadingMessages(false);
      }
    }

    async function syncNewMessages() {
      if (isDeletingChatRef.current) {
        return;
      }

      const latestMessageCreatedAt = latestMessageCreatedAtRef.current;

      if (!latestMessageCreatedAt) {
        await syncAllMessages();
        return;
      }

      const { data, error } = await fetchMessagesAfter(
        latestMessageCreatedAt,
        signedInUser.id,
      );

      if (!isMounted || isDeletingChatRef.current) {
        return;
      }

      if (error) {
        setErrorMessage("Не получилось загрузить новые сообщения.");
      } else if (data?.length) {
        setMessages((currentMessages) => mergeMessages(currentMessages, data));
        handleIncomingNotifications(data);
        setErrorMessage("");
      }
    }

    ensureCurrentProfile();
    syncAllMessages(selectedChatUserIdRef.current === null);

    const startupSyncTimeouts = [350, 1200, 2500].map((delay) =>
      window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          syncNewMessages();
        }
      }, delay),
    );

    const newMessagesInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncNewMessages();
      }
    }, 15_000);

    const fullSyncInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncAllMessages();
      }
    }, 60_000);

    const channel = supabase
      .channel("messages-channel", {
        config: {
          broadcast: {
            ack: false,
            self: false,
          },
        },
      })
      .on(
        "broadcast",
        { event: "message-upsert" },
        (event) => {
          const message = (event.payload as { message?: unknown } | null)?.message;

          if (!isStoredMessageRow(message)) {
            return;
          }

          if (isDeletingChatRef.current) {
            return;
          }

          if (!isDirectMessageForUser(message, signedInUser.id)) {
            return;
          }

          setMessages((currentMessages) =>
            mergeMessages(currentMessages, [message]),
          );
          handleIncomingNotifications([message]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;

          if (isDeletingChatRef.current) {
            return;
          }

          if (!isDirectMessageForUser(newMessage, signedInUser.id)) {
            return;
          }

          setMessages((currentMessages) =>
            mergeMessages(currentMessages, [newMessage]),
          );
          handleIncomingNotifications([newMessage]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const deletedMessage = payload.old as Pick<MessageRow, "id">;

          setMessages((currentMessages) =>
            currentMessages.filter((message) => message.id !== deletedMessage.id),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updatedMessage = payload.new as MessageRow;

          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === updatedMessage.id ? updatedMessage : message,
            ),
          );
        },
      )
      .subscribe();

    messagesChannelRef.current = channel;

    return () => {
      isMounted = false;
      for (const timeoutId of startupSyncTimeouts) {
        window.clearTimeout(timeoutId);
      }
      window.clearInterval(newMessagesInterval);
      window.clearInterval(fullSyncInterval);
      if (messagesChannelRef.current === channel) {
        messagesChannelRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [
    activeViewRef,
    blockedProfileIdsRef,
    isDeletingChatRef,
    mutedProfilesRef,
    notificationsEnabledRef,
    selectedChatUserIdRef,
    setActiveView,
    setErrorMessage,
    setIsLoadingMessages,
    setSelectedChatUserId,
    user,
  ]);

  function resetMessageSyncCursor() {
    latestMessageCreatedAtRef.current = null;
  }

  const broadcastMessage = useCallback((message: MessageRow) => {
    void messagesChannelRef.current?.send({
      event: "message-upsert",
      payload: { message },
      type: "broadcast",
    });
  }, []);

  return {
    broadcastMessage,
    loadedDialogUserIds,
    messages,
    setMessages,
    resetMessageSyncCursor,
  };
}
