import { Dispatch, SetStateAction, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { messageColumns } from "@/shared/constants";
import type {
  CallSignal,
  MessageRow,
  ProfileRow,
} from "@/shared/types";
import {
  createBlockMessageText,
  getBlockMessagePayload,
  isDirectMessageForUser,
  mergeMessages,
  settleOptimisticMessage,
} from "@/shared/utils/messages";
import { writeStoredStringList } from "@/shared/utils/storage";
import type { UserSyncPayload } from "@/features/sync/queries";
import type { User } from "@supabase/supabase-js";

type BlockConfirmation = {
  action: "block" | "unblock";
  targetLabel: string;
  userId: string;
} | null;

type UseProfileBlockStateParams = {
  activeUserName: string;
  blockConfirmation: BlockConfirmation;
  broadcastMessage: (message: MessageRow) => void;
  localBlockedProfileIds: string[];
  messages: MessageRow[];
  profilesByUserId: Map<string, ProfileRow>;
  saveUserSyncPatch: (patch: UserSyncPayload) => void;
  setBlockConfirmation: Dispatch<SetStateAction<BlockConfirmation>>;
  setEditingMessage: Dispatch<SetStateAction<MessageRow | null>>;
  setErrorMessage: (message: string) => void;
  setIncomingCall: Dispatch<SetStateAction<CallSignal | null>>;
  setLocalBlockedProfileIds: (profileIds: string[]) => void;
  setMessageText: (messageText: string) => void;
  setMessages: Dispatch<SetStateAction<MessageRow[]>>;
  setProfileNotificationMenuUserId: (profileUserId: string | null) => void;
  setReplyTarget: Dispatch<SetStateAction<MessageRow | null>>;
  user: User | null;
};

function createOptimisticBlockMessage({
  activeUserName,
  recipientId,
  text,
  userId,
}: {
  activeUserName: string;
  recipientId: string;
  text: string;
  userId: string | null;
}) {
  const now = Date.now();

  return {
    author: activeUserName,
    client_key: `local-message-${now}-${crypto.randomUUID()}`,
    created_at: new Date(now).toISOString(),
    id: -now,
    recipient_id: recipientId,
    text,
    user_id: userId,
  } satisfies MessageRow;
}

export function useProfileBlockState({
  activeUserName,
  blockConfirmation,
  broadcastMessage,
  localBlockedProfileIds,
  messages,
  profilesByUserId,
  saveUserSyncPatch,
  setBlockConfirmation,
  setEditingMessage,
  setErrorMessage,
  setIncomingCall,
  setLocalBlockedProfileIds,
  setMessageText,
  setMessages,
  setProfileNotificationMenuUserId,
  setReplyTarget,
  user,
}: UseProfileBlockStateParams) {
  const currentUserId = user?.id;
  const blockState = useMemo(() => {
    const blockedByMeIds = new Set<string>();
    const blockedMeIds = new Set<string>();

    for (const message of messages) {
      const blockPayload = getBlockMessagePayload(message.text);

      if (!blockPayload || !message.user_id || !currentUserId) {
        continue;
      }

      if (!isDirectMessageForUser(message, currentUserId)) {
        continue;
      }

      if (message.user_id === currentUserId) {
        if (blockPayload.action === "block") {
          blockedByMeIds.add(blockPayload.blockedId);
        } else {
          blockedByMeIds.delete(blockPayload.blockedId);
        }
      }

      if (blockPayload.blockedId === currentUserId) {
        if (blockPayload.action === "block") {
          blockedMeIds.add(message.user_id);
        } else {
          blockedMeIds.delete(message.user_id);
        }
      }
    }

    return {
      blockedByMeIds: Array.from(blockedByMeIds),
      blockedMeIds: Array.from(blockedMeIds),
    };
  }, [currentUserId, messages]);

  const blockedProfileIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...localBlockedProfileIds,
          ...blockState.blockedByMeIds,
          ...blockState.blockedMeIds,
        ]),
      ),
    [blockState.blockedByMeIds, blockState.blockedMeIds, localBlockedProfileIds],
  );

  const blockedByMeProfileIds = useMemo(
    () => Array.from(new Set([...localBlockedProfileIds, ...blockState.blockedByMeIds])),
    [blockState.blockedByMeIds, localBlockedProfileIds],
  );

  const blockedByMeProfiles = useMemo(() => {
    return blockedByMeProfileIds
      .map((profileId) => {
        const profile = profilesByUserId.get(profileId);

        return {
          avatarUrl: profile?.avatar_url ?? null,
          name: profile?.display_name ?? "Пользователь",
          username: profile?.username ?? null,
          userId: profileId,
        };
      })
      .sort((firstProfile, secondProfile) =>
        firstProfile.name.localeCompare(secondProfile.name, "ru"),
      );
  }, [blockedByMeProfileIds, profilesByUserId]);

  const requestBlockChange = useCallback(
    (profileUserId: string, targetLabel: string) => {
      if (!profileUserId) {
        return;
      }

      setProfileNotificationMenuUserId(null);
      setBlockConfirmation({
        action: blockedByMeProfileIds.includes(profileUserId) ? "unblock" : "block",
        targetLabel,
        userId: profileUserId,
      });
    },
    [
      blockedByMeProfileIds,
      setBlockConfirmation,
      setProfileNotificationMenuUserId,
    ],
  );

  const confirmBlockChange = useCallback(async () => {
    if (!blockConfirmation) {
      return;
    }

    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const { action, userId } = blockConfirmation;

    setBlockConfirmation(null);
    setProfileNotificationMenuUserId(null);

    const nextLocalBlockedProfileIds =
      action === "block"
        ? Array.from(new Set([...localBlockedProfileIds, userId]))
        : localBlockedProfileIds.filter((profileId) => profileId !== userId);

    setLocalBlockedProfileIds(nextLocalBlockedProfileIds);
    writeStoredStringList("hush-blocked-profiles", nextLocalBlockedProfileIds);
    saveUserSyncPatch({ blockedProfileIds: nextLocalBlockedProfileIds });

    const messageText = createBlockMessageText(userId, action);
    const optimisticMessage = createOptimisticBlockMessage({
      activeUserName,
      recipientId: userId,
      text: messageText,
      userId: user.id,
    });

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        recipient_id: userId,
        text: messageText,
        user_id: user.id,
      })
      .select(messageColumns)
      .single();

    if (error || !data) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("Не получилось изменить блокировку. Попробуй ещё раз.");
      return;
    }

    setMessages((currentMessages) =>
      settleOptimisticMessage(currentMessages, optimisticMessage, data),
    );
    broadcastMessage(data);

    if (action === "block") {
      setIncomingCall((currentCall) =>
        currentCall?.sender_id === userId ? null : currentCall,
      );
    }

    setMessageText("");
    setReplyTarget(null);
    setEditingMessage(null);
    setErrorMessage("");
  }, [
    activeUserName,
    blockConfirmation,
    broadcastMessage,
    localBlockedProfileIds,
    saveUserSyncPatch,
    setBlockConfirmation,
    setEditingMessage,
    setErrorMessage,
    setIncomingCall,
    setLocalBlockedProfileIds,
    setMessageText,
    setMessages,
    setProfileNotificationMenuUserId,
    setReplyTarget,
    user,
  ]);

  return {
    blockedByMeProfileIds,
    blockedByMeProfiles,
    blockedMeProfileIds: blockState.blockedMeIds,
    blockedProfileIds,
    confirmBlockChange,
    requestBlockChange,
  };
}
