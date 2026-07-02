import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { messageColumns } from "@/shared/constants";
import type { FavoriteItem, MessageRow, ProfileRow } from "@/shared/types";
import {
  createForwardMessageText,
  mergeMessages,
  settleOptimisticMessage,
} from "@/shared/utils/messages";

type ForwardMessagesStateParams = {
  activeUserName: string;
  blockedByMeProfileIds: string[];
  broadcastMessage: (message: MessageRow) => void;
  currentProfile: ProfileRow | null | undefined;
  favoriteItems: FavoriteItem[];
  profilesByUserId: Map<string, ProfileRow>;
  saveFavoriteItems: (items: FavoriteItem[]) => void;
  selectedForwardMessages: MessageRow[];
  setErrorMessage: (message: string) => void;
  setFavoriteContextMenu: (menu: null) => void;
  setMessageContextMenu: (menu: null) => void;
  setMessages: Dispatch<SetStateAction<MessageRow[]>>;
  setSelectedChatUserId: (userId: string | null) => void;
  setSelectedMessageIds: (ids: number[]) => void;
  user: User | null;
};

export function useForwardMessagesState({
  activeUserName,
  blockedByMeProfileIds,
  broadcastMessage,
  currentProfile,
  favoriteItems,
  profilesByUserId,
  saveFavoriteItems,
  selectedForwardMessages,
  setErrorMessage,
  setFavoriteContextMenu,
  setMessageContextMenu,
  setMessages,
  setSelectedChatUserId,
  setSelectedMessageIds,
  user,
}: ForwardMessagesStateParams) {
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [isForwardingMessages, setIsForwardingMessages] = useState(false);

  function getForwardedTexts() {
    if (!user) {
      return [];
    }

    return selectedForwardMessages.map((message) => {
      const sourceProfile = message.user_id === user.id
        ? currentProfile
        : message.user_id
          ? profilesByUserId.get(message.user_id)
          : null;
      const sourceName = sourceProfile?.display_name ?? message.author;

      return createForwardMessageText(message, sourceName);
    });
  }

  function forwardSelectedMessages() {
    if (selectedForwardMessages.length === 0) {
      return;
    }

    setIsForwardDialogOpen(true);
    setMessageContextMenu(null);
    setFavoriteContextMenu(null);
    setErrorMessage("");
  }

  async function forwardMessagesToProfile(profile: ProfileRow) {
    if (!user || selectedForwardMessages.length === 0 || isForwardingMessages) {
      return;
    }

    if (blockedByMeProfileIds.includes(profile.user_id)) {
      setErrorMessage("Сначала разблокируй пользователя, чтобы переслать ему сообщение.");
      return;
    }

    const now = Date.now();
    const forwardedTexts = getForwardedTexts();
    const optimisticMessages: MessageRow[] = forwardedTexts.map((text, index) => ({
      author: activeUserName,
      client_key: `local-forward-${now + index}-${crypto.randomUUID()}`,
      created_at: new Date(now + index).toISOString(),
      id: -(now + index + 1),
      recipient_id: profile.user_id,
      text,
      user_id: user.id,
    }));

    setIsForwardingMessages(true);
    setIsForwardDialogOpen(false);
    setSelectedMessageIds([]);
    setSelectedChatUserId(profile.user_id);
    setMessages((currentMessages) =>
      mergeMessages(currentMessages, optimisticMessages),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert(
        forwardedTexts.map((text) => ({
          author: activeUserName,
          recipient_id: profile.user_id,
          text,
          user_id: user.id,
        })),
      )
      .select(messageColumns);

    setIsForwardingMessages(false);

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter(
          (message) =>
            !optimisticMessages.some(
              (optimisticMessage) => optimisticMessage.id === message.id,
            ),
        ),
      );
      setSelectedMessageIds(selectedForwardMessages.map((message) => message.id));
      setErrorMessage("Не получилось переслать сообщения.");
      return;
    }

    setMessages((currentMessages) =>
      optimisticMessages.reduce((nextMessages, optimisticMessage, index) => {
        const savedMessage = data?.[index];

        return savedMessage
          ? settleOptimisticMessage(nextMessages, optimisticMessage, savedMessage)
          : nextMessages;
      }, currentMessages),
    );
    data?.forEach((message) => broadcastMessage(message));
    setErrorMessage("Сообщения пересланы.");
  }

  async function forwardMessagesToFavorites() {
    if (!user || selectedForwardMessages.length === 0 || isForwardingMessages) {
      return;
    }

    const now = Date.now();
    const forwardedTexts = getForwardedTexts();
    const nextFavoriteItems: FavoriteItem[] = forwardedTexts.map((text, index) => {
      const createdAt = new Date(now + index).toISOString();

      return {
        author: activeUserName,
        created_at: createdAt,
        id: now + index,
        recipient_id: user.id,
        saved_at: createdAt,
        text,
        user_id: user.id,
      };
    });

    saveFavoriteItems([...favoriteItems, ...nextFavoriteItems]);
    setIsForwardDialogOpen(false);
    setSelectedMessageIds([]);
    setMessageContextMenu(null);
    setFavoriteContextMenu(null);
    setErrorMessage("Сообщения сохранены в избранном.");
  }

  return {
    forwardMessagesToFavorites,
    forwardMessagesToProfile,
    forwardSelectedMessages,
    isForwardDialogOpen,
    isForwardingMessages,
    setIsForwardDialogOpen,
  };
}
