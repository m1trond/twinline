"use client";

import {
  ChangeEvent,
  FormEvent,
  MouseEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { flushSync } from "react-dom";
import { supabase } from "@/lib/supabase";
import { BlockConfirmationDialog } from "@/components/feedback/BlockConfirmationDialog";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { AppShell } from "@/components/layout/AppShell";
import { ImagePreviewOverlay } from "@/components/media/ImagePreviewOverlay";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { useAuthFormState } from "@/features/auth/useAuthFormState";
import { useAuthSessionState } from "@/features/auth/useAuthSessionState";
import { CallPanel } from "@/features/calls/components/CallPanel";
import { useCallPanelEffects } from "@/features/calls/useCallPanelEffects";
import { useCallSignals } from "@/features/calls/useCallSignals";
import { useCallState } from "@/features/calls/useCallState";
import { ChatContextMenu } from "@/features/messages/components/ChatContextMenu";
import { ChatListView } from "@/features/messages/components/ChatListView";
import { FavoritesView } from "@/features/messages/components/FavoritesView";
import {
  FavoriteContextMenu,
  MessageContextMenu,
} from "@/features/messages/components/MessageContextMenu";
import {
  ChatDeleteDialog,
  MessageDeleteDialog,
  MessagePinDialog,
  SelectedMessagesDeleteDialog,
  UnpinAllDialog,
} from "@/features/messages/components/MessageDialogs";
import { OpenChatView } from "@/features/messages/components/OpenChatView";
import { StickerPicker } from "@/features/messages/components/StickerPicker";
import { useFavoritesState } from "@/features/messages/hooks/useFavoritesState";
import { useMessageComposerState } from "@/features/messages/hooks/useMessageComposerState";
import { useMessageReceiptEffects } from "@/features/messages/hooks/useMessageReceiptEffects";
import { useMessagesRealtimeState } from "@/features/messages/hooks/useMessagesRealtimeState";
import { useMessageSelectionState } from "@/features/messages/hooks/useMessageSelectionState";
import { useMessageViewportEffects } from "@/features/messages/hooks/useMessageViewportEffects";
import { useStoredMessageState } from "@/features/messages/hooks/useStoredMessageState";
import { useTypingClock } from "@/features/messages/hooks/useTypingClock";
import { useNavigationState } from "@/features/navigation/useNavigationState";
import { AvatarDeleteDialog } from "@/features/profile/components/AvatarDeleteDialog";
import { AvatarGalleryOverlay } from "@/features/profile/components/AvatarGalleryOverlay";
import { ProfileView } from "@/features/profile/components/ProfileView";
import { ViewedProfileModal } from "@/features/profile/components/ViewedProfileModal";
import { useAvatarActions } from "@/features/profile/useAvatarActions";
import { useProfileEditorState } from "@/features/profile/useProfileEditorState";
import { useProfilesState } from "@/features/profile/useProfilesState";
import { SettingsView } from "@/features/settings/components/SettingsView";
import { usePrivacySettingsState } from "@/features/settings/usePrivacySettingsState";
import {
  audioMessagePrefix,
  callMessagePrefix,
  imageMessagePrefix,
  maxAttachmentSize,
  messageColumns,
  profileColumns,
  stickerOptions,
  stickerMessagePrefix,
  videoMessagePrefix,
} from "@/shared/constants";
import { fetchUsernameOwner } from "@/features/messages/queries";
import type {
  ActiveView,
  CallSignalType,
  CallStatus,
  FavoriteItem,
  MessageRow,
  MutedProfileUntil,
  PinMessagePayload,
  ProfileRow,
  ReceiptMessagePayload,
  ReplyMessagePayload,
} from "@/shared/types";
import { isSessionDescriptionPayload } from "@/shared/utils/callSignals";
import {
  getAttachmentFolder,
  getSafeFileExtension,
} from "@/shared/utils/files";
import {
  canChangeName,
  getDisplayName,
  getNextNameChangeDate,
  getUsernameError,
  normalizeUsername,
} from "@/shared/utils/profile";
import {
  pruneMutedProfiles,
  writeStoredBoolean,
  writeStoredMutedProfiles,
  writeStoredPinnedMessageIds,
  writeStoredStringList,
} from "@/shared/utils/storage";
import {
  createBlockMessageText,
  createFileMessageText,
  createPinMessageText,
  createReplyMessageText,
  createTypingMessageText,
  getBlockMessagePayload,
  getPinMessagePayload,
  getReadableMessageText,
  getReceiptMessagePayload,
  getTypingMessagePayload,
  isDirectMessageForUser,
  isMessageBetweenUsers,
  isServiceMessage,
  mergeMessages,
  updateReplyMessageBody,
} from "@/shared/utils/messages";
import { useFloatingUiState } from "@/shared/hooks/useFloatingUiState";
import {
  clampPanelPosition,
  getCenteredCallPanelPosition,
} from "@/shared/utils/viewport";

export default function Home() {
  const typingNow = useTypingClock();
  const {
    authMode,
    setAuthMode,
    authContactMethod,
    setAuthContactMethod,
    authUsername,
    setAuthUsername,
    authUsernameError,
    setAuthUsernameError,
    authEmail,
    setAuthEmail,
    authPhone,
    setAuthPhone,
    authPassword,
    setAuthPassword,
  } = useAuthFormState();
  const {
    profileName,
    setProfileName,
    profileUsername,
    setProfileUsername,
    profileUsernameError,
    setProfileUsernameError,
    avatarHistory,
    setAvatarHistory,
    avatarGalleryItems,
    setAvatarGalleryItems,
    avatarGalleryIndex,
    setAvatarGalleryIndex,
    canDeleteAvatarFromGallery,
    setCanDeleteAvatarFromGallery,
    isAvatarDeleteDialogOpen,
    setIsAvatarDeleteDialogOpen,
    isUploadingAvatar,
    setIsUploadingAvatar,
  } = useProfileEditorState();
  const {
    activeView,
    setActiveView,
    selectedChatUserId,
    setSelectedChatUserId,
    selectedImageUrl,
    setSelectedImageUrl,
    viewedProfile,
    setViewedProfile,
  } = useNavigationState();
  const {
    messageText,
    setMessageText,
    chatSearchQuery,
    setChatSearchQuery,
    isLoadingMessages,
    setIsLoadingMessages,
    isUploadingAttachment,
    setIsUploadingAttachment,
    isRecordingVoice,
    setIsRecordingVoice,
    voiceRecordingDuration,
    setVoiceRecordingDuration,
    voiceRecordingStartedAt,
    setVoiceRecordingStartedAt,
    voiceInputLevel,
    setVoiceInputLevel,
    isStickerPickerOpen,
    setIsStickerPickerOpen,
    stickerPickerPosition,
    setStickerPickerPosition,
  } = useMessageComposerState();
  const {
    callStatus,
    setCallStatus,
    incomingCall,
    setIncomingCall,
    isCallMicMuted,
    setIsCallMicMuted,
    callStartedAt,
    setCallStartedAt,
    callDuration,
    setCallDuration,
    isCallPanelCollapsed,
    setIsCallPanelCollapsed,
    callPanelPosition,
    setCallPanelPosition,
  } = useCallState();
  const {
    highlightedMessageId,
    setHighlightedMessageId,
    unreadMessageCount,
    setUnreadMessageCount,
    replyTarget,
    setReplyTarget,
    editingMessage,
    setEditingMessage,
    isPinnedMessagesViewOpen,
    setIsPinnedMessagesViewOpen,
    isUnpinAllDialogOpen,
    setIsUnpinAllDialogOpen,
    pinnedNavigationIndex,
    setPinnedNavigationIndex,
    messagePinTarget,
    setMessagePinTarget,
    shouldPinForBoth,
    setShouldPinForBoth,
    selectedMessageIds,
    setSelectedMessageIds,
    messageDeleteTarget,
    setMessageDeleteTarget,
    isSelectedDeleteDialogOpen,
    setIsSelectedDeleteDialogOpen,
    isChatDeleteDialogOpen,
    setIsChatDeleteDialogOpen,
    chatDeleteTargetUserId,
    setChatDeleteTargetUserId,
    isDeletingChat,
    setIsDeletingChat,
  } = useMessageSelectionState();
  const {
    areNotificationsEnabled,
    setAreNotificationsEnabled,
    isOnlineStatusVisible,
    setIsOnlineStatusVisible,
    isPhoneVisible,
    setIsPhoneVisible,
    isProfileSearchable,
    setIsProfileSearchable,
    areSoftEffectsEnabled,
    setAreSoftEffectsEnabled,
    isLightThemeEnabled,
    setIsLightThemeEnabled,
    mutedProfiles,
    setMutedProfiles,
    localBlockedProfileIds,
    setLocalBlockedProfileIds,
  } = usePrivacySettingsState();
  const {
    messageContextMenu,
    setMessageContextMenu,
    favoriteContextMenu,
    setFavoriteContextMenu,
    chatContextMenu,
    setChatContextMenu,
    profileNotificationMenuUserId,
    setProfileNotificationMenuUserId,
    blockConfirmation,
    setBlockConfirmation,
    errorMessage,
    setErrorMessage,
  } = useFloatingUiState();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const stickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const highlightedMessageTimeoutRef = useRef<number | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteCallStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callStatusRef = useRef<CallStatus>("idle");
  const callPartnerIdRef = useRef<string | null>(null);
  const localCallStreamRef = useRef<MediaStream | null>(null);
  const callStartedAtRef = useRef<number | null>(null);
  const hasSavedCallSummaryRef = useRef(false);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const processedCallSignalIdsRef = useRef<Set<string>>(new Set());
  const latestCallSignalCreatedAtRef = useRef<string>("1970-01-01T00:00:00.000Z");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const shouldDiscardRecordingRef = useRef(false);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const recordingAnimationFrameRef = useRef<number | null>(null);
  const typingSentAtRef = useRef(0);
  const notificationsEnabledRef = useRef(false);
  const mutedProfilesRef = useRef<MutedProfileUntil>({});
  const blockedProfileIdsRef = useRef<Set<string>>(new Set());
  const activeViewRef = useRef<ActiveView>("profile");
  const selectedChatUserIdRef = useRef<string | null>(null);
  const originalPageTitleRef = useRef("Hush");
  const isDeletingChatRef = useRef(false);
  const callPanelDragRef = useRef({
    left: 0,
    pointerId: 0,
    startX: 0,
    startY: 0,
    top: 0,
  });
  const handleAuthUserChange = useCallback(() => {
  }, []);
  const {
    user,
    isAuthLoading,
    isSigningOut,
    setIsSigningOut,
  } = useAuthSessionState({
    activeView,
    onAuthUserChange: handleAuthUserChange,
    selectedChatUserId,
    setActiveView,
    setSelectedChatUserId,
  });
  const {
    favoriteItems,
    pinnedFavoriteItem,
    setPinnedFavoriteItem,
    saveFavoriteItems,
  } = useFavoritesState(user?.id);
  const {
    hiddenMessageIdSet,
    setHiddenMessageIds,
    pinnedMessageIdsByChat,
    setPinnedMessageIdsByChat,
  } = useStoredMessageState(user?.id);
  const {
    messages,
    setMessages,
    resetMessageSyncCursor,
  } = useMessagesRealtimeState({
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
    setUnreadMessageCount,
    user,
  });
  const {
    profiles,
    setProfiles,
    currentProfile,
    profilesByUserId,
  } = useProfilesState({
    setErrorMessage,
    user,
  });

  const selectedMessageIdSet = useMemo(() => {
    return new Set(selectedMessageIds);
  }, [selectedMessageIds]);
  const activeUserName = useMemo(() => {
    return currentProfile?.display_name ?? getDisplayName(user);
  }, [currentProfile?.display_name, user]);
  const sendServiceMessage = useCallback(
    async (text: string, recipientId = selectedChatUserId) => {
      if (!user) {
        return;
      }

      if (!recipientId) {
        return;
      }

      await supabase.from("messages").insert({
        author: activeUserName,
        recipient_id: recipientId,
        text,
        user_id: user.id,
      });
    },
    [activeUserName, selectedChatUserId, user],
  );
  const sendTypingState = useCallback(
    async (action: "start" | "stop") => {
      if (!user || !selectedChatUserId) {
        return;
      }

      const eventAt = new Date().toISOString();

      const { error } = await supabase.from("messages").insert({
        author: activeUserName,
        recipient_id: selectedChatUserId,
        text: createTypingMessageText(action, eventAt),
        user_id: user.id,
      });

      if (error) {
        console.error("Hush typing state failed:", error.message);
      }
    },
    [activeUserName, selectedChatUserId, user],
  );
  const sharedPinnedMessageIds = useMemo(() => {
    const pinnedIds = new Map<number, PinMessagePayload["action"]>();

    for (const message of messages) {
      const pinPayload = getPinMessagePayload(message.text);

      if (pinPayload) {
        pinnedIds.set(pinPayload.messageId, pinPayload.action);
      }
    }

    return new Set(
      Array.from(pinnedIds.entries())
        .filter(([, action]) => action === "pin")
        .map(([messageId]) => messageId),
    );
  }, [messages]);
  const sharedPinnedMessageIdSet = useMemo(() => {
    return new Set(sharedPinnedMessageIds);
  }, [sharedPinnedMessageIds]);
  const messageReceiptStatuses = useMemo(() => {
    const statuses = new Map<number, ReceiptMessagePayload["status"]>();

    for (const message of messages) {
      const receiptPayload = getReceiptMessagePayload(message.text);

      if (!receiptPayload || message.user_id === user?.id) {
        continue;
      }

      const currentStatus = statuses.get(receiptPayload.messageId);

      if (receiptPayload.status === "read" || currentStatus !== "read") {
        statuses.set(receiptPayload.messageId, receiptPayload.status);
      }
    }

    return statuses;
  }, [messages, user?.id]);
  const sentReceiptMessageIdSets = useMemo(() => {
    const deliveredMessageIds = new Set<number>();
    const readMessageIds = new Set<number>();

    if (!user) {
      return { deliveredMessageIds, readMessageIds };
    }

    for (const message of messages) {
      const receiptPayload = getReceiptMessagePayload(message.text);

      if (!receiptPayload || message.user_id !== user.id) {
        continue;
      }

      if (receiptPayload.status === "delivered" || receiptPayload.status === "read") {
        deliveredMessageIds.add(receiptPayload.messageId);
      }

      if (receiptPayload.status === "read") {
        readMessageIds.add(receiptPayload.messageId);
      }
    }

    return { deliveredMessageIds, readMessageIds };
  }, [messages, user]);
  const incomingUnreadMessageIds = useMemo(() => {
    if (!user) {
      return new Set<number>();
    }

    const readMessageIds = new Set<number>();

    for (const message of messages) {
      const receiptPayload = getReceiptMessagePayload(message.text);

      if (
        message.user_id === user.id &&
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
            isDirectMessageForUser(message, user.id) &&
            message.user_id !== user.id &&
            !hiddenMessageIdSet.has(message.id) &&
            !isServiceMessage(message.text) &&
            !readMessageIds.has(message.id)
          );
        })
        .map((message) => message.id),
    );
  }, [hiddenMessageIdSet, messages, user]);
  const unreadMessageCountFromReceipts = incomingUnreadMessageIds.size;
  const totalUnreadMessageCount = Math.max(
    unreadMessageCount,
    unreadMessageCountFromReceipts,
  );
  const friendTypingUntilFromMessages = useMemo(() => {
    if (!user || !selectedChatUserId) {
      return 0;
    }

    let latestFriendTypingCreatedAt = 0;
    let latestFriendTypingExpiresAt = 0;
    let latestFriendRealMessageCreatedAt = 0;

    for (const message of messages) {
      if (
        message.user_id !== selectedChatUserId ||
        message.recipient_id !== user.id
      ) {
        continue;
      }

      const createdAt = new Date(message.created_at).getTime();
      const typingPayload = getTypingMessagePayload(message.text);

      if (typingPayload) {
        if (createdAt >= latestFriendTypingCreatedAt) {
          latestFriendTypingCreatedAt = createdAt;
          latestFriendTypingExpiresAt =
            typingPayload.action === "stop"
              ? 0
              : createdAt + 4500;
        }

        continue;
      }

      if (!isServiceMessage(message.text)) {
        latestFriendRealMessageCreatedAt = Math.max(
          latestFriendRealMessageCreatedAt,
          createdAt,
        );
      }
    }

    if (
      !latestFriendTypingExpiresAt ||
      latestFriendTypingCreatedAt <= latestFriendRealMessageCreatedAt
    ) {
      return 0;
    }

    return latestFriendTypingExpiresAt;
  }, [messages, selectedChatUserId, user]);
  const isFriendTyping = friendTypingUntilFromMessages > typingNow;
  const blockState = useMemo(() => {
    const blockedByMeIds = new Set<string>();
    const blockedMeIds = new Set<string>();

    for (const message of messages) {
      const blockPayload = getBlockMessagePayload(message.text);

      if (!blockPayload || !message.user_id || !user?.id) {
        continue;
      }

      if (!isDirectMessageForUser(message, user.id)) {
        continue;
      }

      if (message.user_id === user.id) {
        if (blockPayload.action === "block") {
          blockedByMeIds.add(blockPayload.blockedId);
        } else {
          blockedByMeIds.delete(blockPayload.blockedId);
        }
      }

      if (blockPayload.blockedId === user.id) {
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
  }, [messages, user?.id]);
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
          name: profile?.display_name ?? "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ",
          username: profile?.username ?? null,
          userId: profileId,
        };
      })
      .sort((firstProfile, secondProfile) =>
        firstProfile.name.localeCompare(secondProfile.name, "ru"),
      );
  }, [blockedByMeProfileIds, profilesByUserId]);
  const visibleMessages = useMemo(() => {
    return messages.filter((message) => {
      return (
        user?.id &&
        isDirectMessageForUser(message, user.id) &&
        !hiddenMessageIdSet.has(message.id) &&
        !isServiceMessage(message.text)
      );
    });
  }, [hiddenMessageIdSet, messages, user?.id]);
  const activeDialogMessages = useMemo(() => {
    if (!user || !selectedChatUserId) {
      return [];
    }

    return visibleMessages.filter((message) => {
      return isMessageBetweenUsers(message, user.id, selectedChatUserId);
    });
  }, [selectedChatUserId, user, visibleMessages]);
  const selectedDialogMessages = useMemo(() => {
    if (!selectedChatUserId) {
      return [];
    }

    return activeDialogMessages.filter((message) => selectedMessageIdSet.has(message.id));
  }, [activeDialogMessages, selectedChatUserId, selectedMessageIdSet]);
  const isMessageSelectionMode = selectedDialogMessages.length > 0;
  const activePinnedMessageIdSet = useMemo(() => {
    const activeLocalPinnedMessageIds = selectedChatUserId
      ? pinnedMessageIdsByChat[selectedChatUserId] ?? []
      : [];

    return new Set([
      ...activeLocalPinnedMessageIds,
      ...Array.from(sharedPinnedMessageIdSet),
    ]);
  }, [pinnedMessageIdsByChat, selectedChatUserId, sharedPinnedMessageIdSet]);
  const activePinnedMessages = useMemo(() => {
    return activeDialogMessages.filter((message) => activePinnedMessageIdSet.has(message.id));
  }, [activeDialogMessages, activePinnedMessageIdSet]);

  const visibleDialogMessages = isPinnedMessagesViewOpen
    ? activePinnedMessages
    : activeDialogMessages;
  const visibleDialogMessagesCount = visibleDialogMessages.length;
  const unreadMessagesByUserId = useMemo(() => {
    const unreadByUserId = new Map<string, number>();

    for (const message of visibleMessages) {
      if (
        message.user_id &&
        message.user_id !== user?.id &&
        incomingUnreadMessageIds.has(message.id)
      ) {
        unreadByUserId.set(
          message.user_id,
          (unreadByUserId.get(message.user_id) ?? 0) + 1,
        );
      }
    }

    return unreadByUserId;
  }, [incomingUnreadMessageIds, user?.id, visibleMessages]);
  const dialogProfileIds = useMemo(() => {
    const profileIds = new Set<string>();

    if (!user) {
      return profileIds;
    }

    for (const message of visibleMessages) {
      const profileId =
        message.user_id === user.id ? message.recipient_id : message.user_id;

      if (profileId && profileId !== user.id) {
        profileIds.add(profileId);
      }
    }

    return profileIds;
  }, [user, visibleMessages]);
  const latestVisibleMessageByProfileId = useMemo(() => {
    const latestMessagesByProfileId = new Map<string, MessageRow>();

    if (!user) {
      return latestMessagesByProfileId;
    }

    for (const message of visibleMessages) {
      const profileId =
        message.user_id === user.id ? message.recipient_id : message.user_id;

      if (profileId && profileId !== user.id) {
        latestMessagesByProfileId.set(profileId, message);
      }
    }

    return latestMessagesByProfileId;
  }, [user, visibleMessages]);
  const chatProfiles = useMemo(() => {
    return profiles
      .filter((profile) => profile.user_id !== user?.id && dialogProfileIds.has(profile.user_id))
      .sort((firstProfile, secondProfile) =>
        firstProfile.display_name.localeCompare(secondProfile.display_name, "ru"),
      );
  }, [dialogProfileIds, profiles, user?.id]);
  const searchableProfiles = useMemo(() => {
    const query = chatSearchQuery.trim().replace(/^@+/, "").toLowerCase();

    if (query.length < 2) {
      return [];
    }

    return profiles
      .filter((profile) => {
        if (profile.user_id === user?.id) {
          return false;
        }

        const username = profile.username?.toLowerCase() ?? "";

        return username.includes(query);
      })
      .sort((firstProfile, secondProfile) => {
        const firstUsername = firstProfile.username?.toLowerCase() ?? "";
        const secondUsername = secondProfile.username?.toLowerCase() ?? "";
        const firstStartsWithQuery = firstUsername.startsWith(query) ? 0 : 1;
        const secondStartsWithQuery = secondUsername.startsWith(query) ? 0 : 1;

        if (firstStartsWithQuery !== secondStartsWithQuery) {
          return firstStartsWithQuery - secondStartsWithQuery;
        }

        return firstProfile.display_name.localeCompare(secondProfile.display_name, "ru");
      })
      .slice(0, 8);
  }, [chatSearchQuery, profiles, user?.id]);
  const friendProfile = useMemo(() => {
    if (!selectedChatUserId) {
      return null;
    }

    const profileFriend = profilesByUserId.get(selectedChatUserId);

    if (profileFriend) {
      return {
        avatarUrl: profileFriend.avatar_url,
        name: profileFriend.display_name,
        username: profileFriend.username,
        updatedAt: profileFriend.updated_at,
        userId: profileFriend.user_id,
      };
    }

    const friendMessage = visibleMessages.find((message) =>
      isMessageBetweenUsers(message, user?.id ?? "", selectedChatUserId),
    );

    if (!friendMessage) {
      return null;
    }

    const profile = friendMessage.user_id ? profilesByUserId.get(friendMessage.user_id) : null;

    return {
      avatarUrl: profile?.avatar_url ?? null,
      name: profile?.display_name ?? friendMessage.author,
      username: profile?.username ?? null,
      updatedAt: profile?.updated_at ?? null,
      userId: friendMessage.user_id,
    };
  }, [profilesByUserId, selectedChatUserId, user?.id, visibleMessages]);
  const isSelectedChatBlockedByMe =
    selectedChatUserId !== null && blockedByMeProfileIds.includes(selectedChatUserId);
  const isSelectedChatBlockingMe =
    selectedChatUserId !== null && blockState.blockedMeIds.includes(selectedChatUserId);
  const isSelectedChatBlocked = isSelectedChatBlockedByMe || isSelectedChatBlockingMe;
  const chatDeleteTargetProfile = useMemo(() => {
    const targetUserId = chatDeleteTargetUserId ?? selectedChatUserId;

    if (!targetUserId) {
      return null;
    }

    const profile = profilesByUserId.get(targetUserId);

    return {
      name: profile?.display_name ?? friendProfile?.name ?? "РўРµРєСѓС‰РёР№ С‡Р°С‚",
      userId: targetUserId,
    };
  }, [chatDeleteTargetUserId, friendProfile?.name, profilesByUserId, selectedChatUserId]);
  const isUsernameChangeAllowed = canChangeName(currentProfile?.username_changed_at ?? null);
  const nextUsernameChangeDate = getNextNameChangeDate(
    currentProfile?.username_changed_at ?? null,
  );
  const profileNameInputValue = profileName || activeUserName;
  const profileUsernameInputValue = profileUsername ?? currentProfile?.username ?? "";
  const {
    avatarGalleryUrl,
    deleteAvatarFromGallery,
    handleAvatarChange,
    openAvatarGallery,
    openProfileAvatarGallery,
  } = useAvatarActions({
    activeUserName,
    avatarGalleryIndex,
    avatarGalleryItems,
    avatarHistory,
    avatarInputRef,
    canDeleteAvatarFromGallery,
    currentProfile,
    isAvatarDeleteDialogOpen,
    setAvatarGalleryIndex,
    setAvatarGalleryItems,
    setAvatarHistory,
    setCanDeleteAvatarFromGallery,
    setErrorMessage,
    setIsAvatarDeleteDialogOpen,
    setIsUploadingAvatar,
    setProfiles,
    setSelectedImageUrl,
    user,
  });
  const incomingCallerProfile = incomingCall
    ? profilesByUserId.get(incomingCall.sender_id)
    : null;
  const callStatusText =
    callStatus === "calling"
      ? "Р—РІРѕРЅСЋ..."
      : callStatus === "incoming"
        ? `Р—РІРѕРЅРёС‚ ${incomingCallerProfile?.display_name ?? "Р”СЂСѓРі"}`
        : callStatus === "connecting"
          ? "РЎРѕРµРґРёРЅРµРЅРёРµ..."
          : callStatus === "connected"
            ? "Р—РІРѕРЅРѕРє РёРґРµС‚"
            : "";
  const callPanelProfile =
    callStatus === "incoming"
      ? {
          avatarUrl: incomingCallerProfile?.avatar_url ?? null,
          name: incomingCallerProfile?.display_name ?? "Р”СЂСѓРі",
        }
      : {
          avatarUrl: friendProfile?.avatarUrl ?? null,
          name: friendProfile?.name ?? "Р”СЂСѓРі",
        };

  useMessageViewportEffects({
    activeDialogMessagesCount: activeDialogMessages.length,
    activeView,
    favoriteItemsCount: favoriteItems.length,
    highlightedMessageTimeoutRef,
    isLoadingMessages,
    messagesListRef,
    selectedChatUserId,
  });
  useCallPanelEffects({
    callStartedAt,
    callStatus,
    isCallPanelCollapsed,
    setCallDuration,
    setCallPanelPosition,
    setIsCallPanelCollapsed,
  });
  useCallSignals({
    blockedProfileIdsRef,
    callPartnerIdRef,
    callStatusRef,
    closeCall,
    latestCallSignalCreatedAtRef,
    markCallConnected,
    peerConnectionRef,
    pendingIceCandidatesRef,
    processedCallSignalIdsRef,
    sendCallSignal,
    setCallPanelPosition,
    setCallStatus,
    setIncomingCall,
    setIsCallPanelCollapsed,
    userId: user?.id,
  });
  useMessageReceiptEffects({
    activeView,
    selectedChatUserId,
    sendServiceMessage,
    sentReceiptMessageIdSets,
    userId: user?.id,
    visibleMessages,
  });








  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);



  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsPinnedMessagesViewOpen(false);
      setPinnedNavigationIndex(0);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedChatUserId, setIsPinnedMessagesViewOpen, setPinnedNavigationIndex]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setSelectedMessageIds([]);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeView, selectedChatUserId, setSelectedMessageIds]);

  useEffect(() => {
    if (pinnedNavigationIndex >= activePinnedMessages.length) {
      const frameId = window.requestAnimationFrame(() => {
        setPinnedNavigationIndex(0);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
  }, [activePinnedMessages.length, pinnedNavigationIndex, setPinnedNavigationIndex]);

  useEffect(() => {
    notificationsEnabledRef.current = areNotificationsEnabled;
  }, [areNotificationsEnabled]);

  useEffect(() => {
    mutedProfilesRef.current = mutedProfiles;
  }, [mutedProfiles]);

  useEffect(() => {
    const mutedProfilesCleanupInterval = window.setInterval(() => {
      setMutedProfiles((currentMutedProfiles) => {
        const nextMutedProfiles = pruneMutedProfiles(currentMutedProfiles);

        if (Object.keys(nextMutedProfiles).length === Object.keys(currentMutedProfiles).length) {
          return currentMutedProfiles;
        }

        writeStoredMutedProfiles(nextMutedProfiles);
        return nextMutedProfiles;
      });
    }, 60_000);

    return () => {
      window.clearInterval(mutedProfilesCleanupInterval);
    };
  }, [setMutedProfiles]);

  useEffect(() => {
    blockedProfileIdsRef.current = new Set(blockedProfileIds);
  }, [blockedProfileIds]);

  useEffect(() => {
    activeViewRef.current = activeView;
    selectedChatUserIdRef.current = selectedChatUserId;
  }, [activeView, selectedChatUserId, setUnreadMessageCount]);

  useEffect(() => {
    originalPageTitleRef.current = document.title || "Hush";
  }, []);

  useEffect(() => {
    if (totalUnreadMessageCount > 0) {
      document.title = `(${totalUnreadMessageCount}) Hush`;
      return;
    }

    document.title = originalPageTitleRef.current;
  }, [totalUnreadMessageCount]);

  useEffect(() => {
    function resetUnreadWhenDialogVisible() {
      if (
        document.visibilityState === "visible" &&
        activeViewRef.current === "messages" &&
        selectedChatUserIdRef.current !== null
      ) {
        setUnreadMessageCount(0);
      }
    }

    resetUnreadWhenDialogVisible();
    document.addEventListener("visibilitychange", resetUnreadWhenDialogVisible);

    return () => {
      document.removeEventListener("visibilitychange", resetUnreadWhenDialogVisible);
    };
  }, [activeView, selectedChatUserId, setUnreadMessageCount]);




  useEffect(() => {
    if (!isRecordingVoice || !voiceRecordingStartedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setVoiceRecordingDuration(
        Math.floor((Date.now() - voiceRecordingStartedAt) / 1000),
      );
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [isRecordingVoice, setVoiceRecordingDuration, voiceRecordingStartedAt]);

  useEffect(() => {
    if (!messageContextMenu && !favoriteContextMenu && !chatContextMenu) {
      return;
    }

    function closeContextMenus() {
      setMessageContextMenu(null);
      setFavoriteContextMenu(null);
      setChatContextMenu(null);
    }

    function closeContextMenusOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeContextMenus();
      }
    }

    window.addEventListener("scroll", closeContextMenus, true);
    window.addEventListener("resize", closeContextMenus);
    window.addEventListener("keydown", closeContextMenusOnEscape);

    return () => {
      window.removeEventListener("scroll", closeContextMenus, true);
      window.removeEventListener("resize", closeContextMenus);
      window.removeEventListener("keydown", closeContextMenusOnEscape);
    };
  }, [
    chatContextMenu,
    favoriteContextMenu,
    messageContextMenu,
    setChatContextMenu,
    setFavoriteContextMenu,
    setMessageContextMenu,
  ]);

  useEffect(() => {
    if (selectedMessageIds.length === 0 && !isSelectedDeleteDialogOpen) {
      return;
    }

    function clearSelectionOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsSelectedDeleteDialogOpen(false);
      setSelectedMessageIds([]);

      window.requestAnimationFrame(() => {
        const messagesList = messagesListRef.current;

        if (!messagesList) {
          return;
        }

        const maxScrollTop = Math.max(0, messagesList.scrollHeight - messagesList.clientHeight);
        messagesList.scrollTop = Math.min(messagesList.scrollTop, maxScrollTop);
      });
    }

    window.addEventListener("keydown", clearSelectionOnEscape, true);

    return () => {
      window.removeEventListener("keydown", clearSelectionOnEscape, true);
    };
  }, [
    isSelectedDeleteDialogOpen,
    selectedMessageIds.length,
    setIsSelectedDeleteDialogOpen,
    setSelectedMessageIds,
  ]);

  const closeTopFloatingLayer = useCallback(() => {
    if (isAvatarDeleteDialogOpen) {
      setIsAvatarDeleteDialogOpen(false);
      return true;
    }

    if (avatarGalleryIndex !== null) {
      setAvatarGalleryIndex(null);
      return true;
    }

    if (selectedImageUrl) {
      setSelectedImageUrl(null);
      return true;
    }

    if (blockConfirmation) {
      setBlockConfirmation(null);
      return true;
    }

    if (profileNotificationMenuUserId) {
      setProfileNotificationMenuUserId(null);
      return true;
    }

    if (messagePinTarget) {
      setMessagePinTarget(null);
      return true;
    }

    if (isUnpinAllDialogOpen) {
      setIsUnpinAllDialogOpen(false);
      return true;
    }

    if (messageDeleteTarget) {
      setMessageDeleteTarget(null);
      return true;
    }

    if (isChatDeleteDialogOpen) {
      setIsChatDeleteDialogOpen(false);
      setChatDeleteTargetUserId(null);
      return true;
    }

    if (isStickerPickerOpen) {
      setIsStickerPickerOpen(false);
      return true;
    }

    if (chatContextMenu) {
      setChatContextMenu(null);
      return true;
    }

    if (favoriteContextMenu) {
      setFavoriteContextMenu(null);
      return true;
    }

    if (messageContextMenu) {
      setMessageContextMenu(null);
      return true;
    }

    if (viewedProfile) {
      setViewedProfile(null);
      return true;
    }

    return false;
  }, [
    avatarGalleryIndex,
    blockConfirmation,
    chatContextMenu,
    favoriteContextMenu,
    isAvatarDeleteDialogOpen,
    isChatDeleteDialogOpen,
    isStickerPickerOpen,
    isUnpinAllDialogOpen,
    messageContextMenu,
    messageDeleteTarget,
    messagePinTarget,
    profileNotificationMenuUserId,
    selectedImageUrl,
    setAvatarGalleryIndex,
    setBlockConfirmation,
    setChatContextMenu,
    setChatDeleteTargetUserId,
    setFavoriteContextMenu,
    setIsAvatarDeleteDialogOpen,
    setIsChatDeleteDialogOpen,
    setIsStickerPickerOpen,
    setIsUnpinAllDialogOpen,
    setMessageContextMenu,
    setMessageDeleteTarget,
    setMessagePinTarget,
    setProfileNotificationMenuUserId,
    setSelectedImageUrl,
    setViewedProfile,
    viewedProfile,
  ]);

  useEffect(() => {
    function closeFloatingLayerOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (!closeTopFloatingLayer()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener("keydown", closeFloatingLayerOnEscape, true);

    return () => {
      window.removeEventListener("keydown", closeFloatingLayerOnEscape, true);
    };
  }, [closeTopFloatingLayer]);


  useEffect(() => {
    return () => {
      stopVoiceInputMeter();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      localCallStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current?.close();
    };
    // stopVoiceInputMeter is intentionally omitted so this teardown only runs on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);






  useEffect(() => {
    if (!user) {
      return;
    }

    return () => {
      void sendTypingState("stop");
    };
  }, [sendTypingState, user]);



  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setAuthUsernameError("");

    if (authContactMethod === "phone") {
      setErrorMessage("Р’С…РѕРґ Рё СЂРµРіРёСЃС‚СЂР°С†РёСЏ РїРѕ С‚РµР»РµС„РѕРЅСѓ СѓР¶Рµ РІ РёРЅС‚РµСЂС„РµР№СЃРµ, SMS-Р»РѕРіРёРєР° РїРѕРєР° РІ СЂР°Р·СЂР°Р±РѕС‚РєРµ.");
      return;
    }

    if (authMode === "sign-up") {
      const nextUsername = normalizeUsername(authUsername);
      const usernameValidationError = getUsernameError(nextUsername);

      if (usernameValidationError) {
        setAuthUsernameError(usernameValidationError);
        return;
      }

      const usernameOwner = await fetchUsernameOwner(nextUsername);

      if (usernameOwner.error) {
        setAuthUsernameError("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РїСЂРѕРІРµСЂРёС‚СЊ РЅРёРє. РџРѕРїСЂРѕР±СѓР№ РµС‰С‘ СЂР°Р·.");
        return;
      }

      if (usernameOwner.data) {
        setAuthUsernameError("РўР°РєРѕР№ РЅРёРє СѓР¶Рµ Р·Р°РЅСЏС‚.");
        return;
      }

      const fallbackDisplayName = authEmail.trim().split("@")[0] || nextUsername;
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            display_name: fallbackDisplayName,
            username: nextUsername,
          },
        },
      });

      if (error) {
        setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°С‚СЊСЃСЏ.");
      } else {
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({
            display_name: fallbackDisplayName,
            username: nextUsername,
            username_changed_at: null,
            user_id: data.user.id,
          });

          if (profileError) {
            setAuthUsernameError("РђРєРєР°СѓРЅС‚ СЃРѕР·РґР°РЅ, РЅРѕ РЅРёРє РЅРµ СЃРѕС…СЂР°РЅРёР»СЃСЏ. РџРѕРїСЂРѕР±СѓР№ РІРѕР№С‚Рё Рё СЃРѕС…СЂР°РЅРёС‚СЊ РЅРёРє РІ РїСЂРѕС„РёР»Рµ.");
            return;
          }
        }

        setErrorMessage("РђРєРєР°СѓРЅС‚ СЃРѕР·РґР°РЅ. Р•СЃР»Рё Supabase РїРѕРїСЂРѕСЃРёС‚, РїРѕРґС‚РІРµСЂРґРё email.");
        setAuthUsername("");
        setAuthMode("sign-in");
      }

      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });

    if (error) {
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РІРѕР№С‚Рё. РџСЂРѕРІРµСЂСЊ email Рё РїР°СЂРѕР»СЊ.");
      return;
    }

    const signedInUser = data.user;

    if (!signedInUser) {
      return;
    }

    const { data: signedInProfile, error: signedInProfileError } = await supabase
      .from("profiles")
      .select("user_id, username")
      .eq("user_id", signedInUser.id)
      .maybeSingle();

    if (signedInProfileError) {
      await supabase.auth.signOut();
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РїСЂРѕРІРµСЂРёС‚СЊ РїСЂРѕС„РёР»СЊ Р°РєРєР°СѓРЅС‚Р°.");
      return;
    }

    if (!signedInProfile) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        avatar_url: currentProfile?.avatar_url ?? null,
        display_name: getDisplayName(signedInUser),
        user_id: signedInUser.id,
      });

      if (profileError) {
        await supabase.auth.signOut();
        setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РїРѕРґРіРѕС‚РѕРІРёС‚СЊ РїСЂРѕС„РёР»СЊ Р°РєРєР°СѓРЅС‚Р°.");
      }
    }
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setErrorMessage("");

    try {
      if (callStatusRef.current !== "idle") {
        await closeCall(true);
      }

      setViewedProfile(null);
      setSelectedImageUrl(null);
      setAvatarGalleryItems([]);
      setCanDeleteAvatarFromGallery(false);
      setAvatarGalleryIndex(null);
      setIsAvatarDeleteDialogOpen(false);
      setProfileNotificationMenuUserId(null);
      setBlockConfirmation(null);
      setMessageContextMenu(null);
      setFavoriteContextMenu(null);
      setChatContextMenu(null);
      setMessageDeleteTarget(null);
      setMessagePinTarget(null);
      setIsChatDeleteDialogOpen(false);
      setChatDeleteTargetUserId(null);
      setIsStickerPickerOpen(false);
      setReplyTarget(null);
      setEditingMessage(null);
      setMessageText("");

      const { error } = await supabase.auth.signOut();

      if (error) {
        setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РІС‹Р№С‚Рё РёР· Р°РєРєР°СѓРЅС‚Р°.");
        return;
      }

      setAuthPassword("");
      setAuthUsername("");
      setAuthUsernameError("");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function sendCallSignal(
    receiverId: string,
    type: CallSignalType,
    payload: Record<string, unknown> | RTCSessionDescriptionInit | RTCIceCandidateInit | null,
  ) {
    if (!user) {
      return;
    }

    await supabase.from("call_signals").insert({
      payload,
      receiver_id: receiverId,
      sender_id: user.id,
      type,
    });
  }

  async function playRemoteAudio() {
    const audioElement = remoteAudioRef.current;

    if (!audioElement) {
      return;
    }

    audioElement.muted = false;
    audioElement.volume = 1;

    try {
      await audioElement.play();
      setErrorMessage("");
    } catch {
      setErrorMessage("РќР°Р¶РјРё В«Р’РєР»СЋС‡РёС‚СЊ Р·РІСѓРєВ», С‡С‚РѕР±С‹ Р±СЂР°СѓР·РµСЂ СЂР°Р·СЂРµС€РёР» Р°СѓРґРёРѕ Р·РІРѕРЅРєР°.");
    }
  }

  function setLocalMicrophoneMuted(isMuted: boolean) {
    localCallStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
    setIsCallMicMuted(isMuted);
  }

  function toggleCallMicrophone() {
    setLocalMicrophoneMuted(!isCallMicMuted);
  }

  function markCallConnected() {
    if (callStatusRef.current !== "connected") {
      const startedAt = Date.now();

      setCallDuration(0);
      setCallStartedAt(startedAt);
      callStartedAtRef.current = startedAt;
      hasSavedCallSummaryRef.current = false;
    }

    callStatusRef.current = "connected";
    setCallStatus("connected");
  }

  function createPeerConnection(receiverId: string) {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(receiverId, "ice", event.candidate.toJSON());
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteStream =
        event.streams[0] ?? remoteCallStreamRef.current ?? new MediaStream();

      if (event.streams.length === 0) {
        remoteStream.addTrack(event.track);
      }

      remoteCallStreamRef.current = remoteStream;

      if (remoteAudioRef.current && remoteStream) {
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1;
        remoteAudioRef.current.srcObject = remoteStream;
        playRemoteAudio();
      }

      event.track.onunmute = () => {
        playRemoteAudio();
      };
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        markCallConnected();
      }

      if (
        peerConnection.connectionState === "disconnected" ||
        peerConnection.connectionState === "failed" ||
        peerConnection.connectionState === "closed"
      ) {
        closeCall(false);
      }
    };

    peerConnectionRef.current = peerConnection;
    callPartnerIdRef.current = receiverId;

    return peerConnection;
  }

  async function getLocalCallStream() {
    if (localCallStreamRef.current) {
      return localCallStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });

    localCallStreamRef.current = stream;

    return stream;
  }

  async function startCall(targetUserId = friendProfile?.userId ?? null) {
    if (!user) {
      return;
    }

    if (!targetUserId || targetUserId === user.id) {
      setErrorMessage("Р§С‚РѕР±С‹ РїРѕР·РІРѕРЅРёС‚СЊ, СЃРЅР°С‡Р°Р»Р° РЅСѓР¶РµРЅ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ РІС…РѕРґ РґСЂСѓРіР° РІ С‡Р°С‚.");
      return;
    }

    if (blockedByMeProfileIds.includes(targetUserId)) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° СЂР°Р·Р±Р»РѕРєРёСЂСѓР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ, С‡С‚РѕР±С‹ РїРѕР·РІРѕРЅРёС‚СЊ РµРјСѓ.");
      return;
    }

    if (blockState.blockedMeIds.includes(targetUserId)) {
      setErrorMessage("РўС‹ РЅРµ РјРѕР¶РµС€СЊ РїРѕР·РІРѕРЅРёС‚СЊ: РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ С‚РµР±СЏ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°Р».");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setErrorMessage("Р­С‚РѕС‚ Р±СЂР°СѓР·РµСЂ РЅРµ РїРѕРґРґРµСЂР¶РёРІР°РµС‚ Р·РІРѕРЅРєРё.");
      return;
    }

    try {
      setErrorMessage("");
      callStatusRef.current = "calling";
      setIsCallPanelCollapsed(false);
      setCallPanelPosition(getCenteredCallPanelPosition(false));
      setCallStatus("calling");
      setCallDuration(0);
      setCallStartedAt(null);
      callStartedAtRef.current = null;
      hasSavedCallSummaryRef.current = false;
      setIsCallMicMuted(false);

      const stream = await getLocalCallStream();
      const peerConnection = createPeerConnection(targetUserId);

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await sendCallSignal(targetUserId, "offer", offer);
    } catch {
      closeCall(false);
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РЅР°С‡Р°С‚СЊ Р·РІРѕРЅРѕРє. РџСЂРѕРІРµСЂСЊ РґРѕСЃС‚СѓРї Рє РјРёРєСЂРѕС„РѕРЅСѓ.");
    }
  }

  async function acceptCall() {
    if (!incomingCall || !isSessionDescriptionPayload(incomingCall.payload)) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setErrorMessage("Р­С‚РѕС‚ Р±СЂР°СѓР·РµСЂ РЅРµ РїРѕРґРґРµСЂР¶РёРІР°РµС‚ Р·РІРѕРЅРєРё.");
      return;
    }

    try {
      setErrorMessage("");
      callStatusRef.current = "connecting";
      setIsCallPanelCollapsed(false);
      setCallPanelPosition(getCenteredCallPanelPosition(false));
      setCallStatus("connecting");
      setCallDuration(0);
      setCallStartedAt(null);
      callStartedAtRef.current = null;
      hasSavedCallSummaryRef.current = false;
      setIsCallMicMuted(false);

      const stream = await getLocalCallStream();
      const peerConnection = createPeerConnection(incomingCall.sender_id);

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      await peerConnection.setRemoteDescription(incomingCall.payload);
      const pendingCandidates = pendingIceCandidatesRef.current;
      pendingIceCandidatesRef.current = [];

      for (const candidate of pendingCandidates) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch {
          pendingIceCandidatesRef.current.push(candidate);
        }
      }

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await sendCallSignal(incomingCall.sender_id, "answer", answer);
      setIncomingCall(null);
      markCallConnected();
    } catch {
      closeCall(false);
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РїСЂРёРЅСЏС‚СЊ Р·РІРѕРЅРѕРє. РџСЂРѕРІРµСЂСЊ РґРѕСЃС‚СѓРї Рє РјРёРєСЂРѕС„РѕРЅСѓ.");
    }
  }

  async function saveCallSummaryMessage() {
    const partnerId = callPartnerIdRef.current;

    if (!user || !partnerId || hasSavedCallSummaryRef.current || !callStartedAtRef.current) {
      return;
    }

    const duration = Math.max(
      1,
      Math.floor((Date.now() - callStartedAtRef.current) / 1000),
    );

    hasSavedCallSummaryRef.current = true;

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      recipient_id: partnerId,
      text: `${callMessagePrefix}${duration}`,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        recipient_id: partnerId,
        text: `${callMessagePrefix}${duration}`,
        user_id: user.id,
      })
      .select(messageColumns)
      .single();

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      hasSavedCallSummaryRef.current = false;
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ Р·Р°РїРёСЃСЊ Рѕ Р·РІРѕРЅРєРµ.");
      return;
    }

    setMessages((currentMessages) => {
      const withoutOptimisticMessage = currentMessages.filter(
        (message) => message.id !== optimisticMessage.id,
      );

      return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
    });
  }

  async function closeCall(notifyPartner: boolean) {
    const partnerId = callPartnerIdRef.current;

    if (notifyPartner && callStatusRef.current === "connected") {
      await saveCallSummaryMessage();
    }

    if (notifyPartner && partnerId) {
      await sendCallSignal(partnerId, "end", { reason: "ended" });
    }

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    callPartnerIdRef.current = null;
    pendingIceCandidatesRef.current = [];
    localCallStreamRef.current?.getTracks().forEach((track) => track.stop());
    localCallStreamRef.current = null;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    remoteCallStreamRef.current = null;
    setIncomingCall(null);
    setIsCallMicMuted(false);
    setCallStartedAt(null);
    callStartedAtRef.current = null;
    setCallDuration(0);
    callStatusRef.current = "idle";
    setCallStatus("idle");
  }

  async function toggleNotifications() {
    const nextValue = !areNotificationsEnabled;

    if (nextValue && "Notification" in window) {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setErrorMessage("Р‘СЂР°СѓР·РµСЂ РЅРµ СЂР°Р·СЂРµС€РёР» СѓРІРµРґРѕРјР»РµРЅРёСЏ.");
        return;
      }
    }

    setAreNotificationsEnabled(nextValue);
    window.localStorage.setItem(
      "twinline-notifications",
      nextValue ? "enabled" : "disabled",
    );
    setErrorMessage("");
  }

  function toggleStoredBooleanSetting(
    key: string,
    setter: (value: boolean) => void,
    currentValue: boolean,
  ) {
    const nextValue = !currentValue;

    setter(nextValue);
    writeStoredBoolean(key, nextValue);
    setErrorMessage("");
  }

  function muteProfileNotifications(profileUserId: string, durationMs: number | null) {
    if (!profileUserId) {
      return;
    }

    const nextMutedProfiles = pruneMutedProfiles({
      ...mutedProfiles,
      [profileUserId]: durationMs === null ? null : Date.now() + durationMs,
    });

    setMutedProfiles(nextMutedProfiles);
    writeStoredMutedProfiles(nextMutedProfiles);
    setProfileNotificationMenuUserId(null);
    setErrorMessage("");
  }

  function unmuteProfileNotifications(profileUserId: string) {
    const nextMutedProfiles = { ...mutedProfiles };

    delete nextMutedProfiles[profileUserId];

    setMutedProfiles(nextMutedProfiles);
    writeStoredMutedProfiles(nextMutedProfiles);
    setProfileNotificationMenuUserId(null);
    setErrorMessage("");
  }

  function requestBlockChange(profileUserId: string, targetLabel: string) {
    if (!profileUserId) {
      return;
    }

    setProfileNotificationMenuUserId(null);
    setBlockConfirmation({
      action: blockedByMeProfileIds.includes(profileUserId) ? "unblock" : "block",
      targetLabel,
      userId: profileUserId,
    });
  }

  async function confirmBlockChange() {
    if (!blockConfirmation) {
      return;
    }

    if (!user) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРё РІ Р°РєРєР°СѓРЅС‚.");
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
    writeStoredStringList("twinline-blocked-profiles", nextLocalBlockedProfileIds);

    const optimisticMessage: MessageRow = {
      author: activeUserName,
      created_at: new Date().toISOString(),
      id: -Date.now(),
      recipient_id: userId,
      text: createBlockMessageText(userId, action),
      user_id: user.id,
    };

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        recipient_id: userId,
        text: createBlockMessageText(userId, action),
        user_id: user.id,
      })
      .select(messageColumns)
      .single();

    if (error || !data) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РёР·РјРµРЅРёС‚СЊ Р±Р»РѕРєРёСЂРѕРІРєСѓ. РџРѕРїСЂРѕР±СѓР№ РµС‰С‘ СЂР°Р·.");
      return;
    }

    setMessages((currentMessages) =>
      mergeMessages(
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
        [data],
      ),
    );

    if (action === "block") {
      setIncomingCall((currentCall) =>
        currentCall?.sender_id === userId ? null : currentCall,
      );
    }

    setMessageText("");
    setReplyTarget(null);
    setEditingMessage(null);
    setErrorMessage("");
  }

  async function confirmDeleteChat() {
    const targetChatUserId = chatDeleteTargetUserId ?? selectedChatUserId;

    if (isDeletingChat || !user || !targetChatUserId) {
      return;
    }

    setIsChatDeleteDialogOpen(false);
    isDeletingChatRef.current = true;
    resetMessageSyncCursor();
    flushSync(() => {
      setIsDeletingChat(true);
    });

    const selectedChatMessageIds = messages
      .filter((message) => {
        return (
          message.id > 0 &&
          !isServiceMessage(message.text) &&
          isMessageBetweenUsers(message, user.id, targetChatUserId)
        );
      })
      .map((message) => message.id);

    if (selectedChatMessageIds.length === 0) {
      if (selectedChatUserId === targetChatUserId) {
        setSelectedChatUserId(null);
      }
      setChatDeleteTargetUserId(null);
      setIsDeletingChat(false);
      isDeletingChatRef.current = false;
      setErrorMessage("");
      return;
    }

    const previousMessages = messages;
    const previousPinnedMessageIdsByChat = pinnedMessageIdsByChat;
    const previousSelectedMessageIds = selectedMessageIds;

    setMessages((currentMessages) =>
      currentMessages.filter((message) => !selectedChatMessageIds.includes(message.id)),
    );
    const nextPinnedMessageIdsByChat = { ...pinnedMessageIdsByChat };
    delete nextPinnedMessageIdsByChat[targetChatUserId];
    setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
    writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
    setSelectedMessageIds((currentIds) =>
      currentIds.filter((id) => !selectedChatMessageIds.includes(id)),
    );

    const { error } = await supabase
      .from("messages")
      .delete()
      .in("id", selectedChatMessageIds);

    if (error) {
      resetMessageSyncCursor();
      setMessages(previousMessages);
      setPinnedMessageIdsByChat(previousPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, previousPinnedMessageIdsByChat);
      setSelectedMessageIds(previousSelectedMessageIds);
      setIsDeletingChat(false);
      isDeletingChatRef.current = false;
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ РїРµСЂРµРїРёСЃРєСѓ Сѓ РґРІРѕРёС….");
      return;
    }

    if (selectedChatUserId === targetChatUserId) {
      setSelectedChatUserId(null);
    }
    setChatDeleteTargetUserId(null);
    setIsDeletingChat(false);
    isDeletingChatRef.current = false;
    setErrorMessage("");
  }

  function toggleStickerPicker() {
    const button = stickerButtonRef.current;

    if (button) {
      const rect = button.getBoundingClientRect();
      const pickerWidth = Math.min(300, window.innerWidth - 32);
      const pickerHeight = 286;

      setStickerPickerPosition({
        left: Math.max(16, Math.min(rect.left, window.innerWidth - pickerWidth - 16)),
        top: Math.max(
          16,
          Math.min(rect.top - 236, window.innerHeight - pickerHeight - 16),
        ),
      });
    }

    setIsStickerPickerOpen((isOpen) => !isOpen);
  }

  function openMessageContextMenu(
    event: MouseEvent<HTMLElement>,
    message: MessageRow,
  ) {
    if (!user) {
      return;
    }

    event.preventDefault();
    setIsStickerPickerOpen(false);

    const menuWidth = Math.min(220, window.innerWidth - 24);
    const menuHeight = 306;

    setMessageContextMenu({
      left: Math.max(
        12,
        Math.min(event.clientX, window.innerWidth - menuWidth - 12),
      ),
      message,
      top: Math.max(
        12,
        Math.min(event.clientY, window.innerHeight - menuHeight - 12),
      ),
    });
  }

  function openFavoriteContextMenu(
    event: MouseEvent<HTMLElement>,
    item: FavoriteItem,
  ) {
    event.preventDefault();
    setIsStickerPickerOpen(false);

    const menuWidth = Math.min(220, window.innerWidth - 24);
    const menuHeight = 306;

    setFavoriteContextMenu({
      item,
      left: Math.max(
        12,
        Math.min(event.clientX, window.innerWidth - menuWidth - 12),
      ),
      top: Math.max(
        12,
        Math.min(event.clientY, window.innerHeight - menuHeight - 12),
      ),
    });
  }

  function openChatContextMenu(
    event: MouseEvent<HTMLElement>,
    profile: ProfileRow,
  ) {
    event.preventDefault();
    setMessageContextMenu(null);
    setFavoriteContextMenu(null);
    setIsStickerPickerOpen(false);

    const menuWidth = Math.min(286, window.innerWidth - 24);
    const menuHeight = 240;

    setChatContextMenu({
      left: Math.max(
        12,
        Math.min(event.clientX, window.innerWidth - menuWidth - 12),
      ),
      profile,
      top: Math.max(
        12,
        Math.min(event.clientY, window.innerHeight - menuHeight - 12),
      ),
    });
  }

  function requestChatDeleteFromMenu(profile: ProfileRow) {
    setChatDeleteTargetUserId(profile.user_id);
    setChatContextMenu(null);
    setIsChatDeleteDialogOpen(true);
  }

  function runChatMenuStub(message: string) {
    setChatContextMenu(null);
    setErrorMessage(message);
  }

  async function copyMessageText(message: MessageRow) {
    try {
      await navigator.clipboard.writeText(getReadableMessageText(message.text));
      setErrorMessage("");
    } catch {
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ С‚РµРєСЃС‚.");
    }

    setMessageContextMenu(null);
  }

  async function copyFavoriteText(item: FavoriteItem) {
    try {
      await navigator.clipboard.writeText(getReadableMessageText(item.text));
      setErrorMessage("");
    } catch {
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ С‚РµРєСЃС‚.");
    }

    setFavoriteContextMenu(null);
  }
  function addFavoriteChatMessage(text: string) {
    if (!user) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРё РІ Р°РєРєР°СѓРЅС‚.");
      return;
    }

    const createdAt = new Date().toISOString();

    saveFavoriteItems([
      ...favoriteItems,
      {
        author: activeUserName,
        created_at: createdAt,
        id: Date.now(),
        recipient_id: user.id,
        saved_at: createdAt,
        text,
        user_id: user.id,
      },
    ]);
    setErrorMessage("");
  }

  function removeFavoriteItem(favoriteItemId: number) {
    saveFavoriteItems(
      favoriteItems.filter((favoriteItem) => favoriteItem.id !== favoriteItemId),
    );
    setPinnedFavoriteItem((currentPinnedItem) =>
      currentPinnedItem?.id === favoriteItemId ? null : currentPinnedItem,
    );
    setSelectedMessageIds((currentIds) =>
      currentIds.filter((id) => id !== favoriteItemId),
    );
    setFavoriteContextMenu(null);
    setErrorMessage("");
  }

  function replyToFavoriteItem(item: FavoriteItem) {
    setReplyTarget(item);
    setEditingMessage(null);
    setMessageText("");
    setFavoriteContextMenu(null);
    setErrorMessage("");

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  }

  function startEditingFavoriteItem(item: FavoriteItem) {
    setEditingMessage(item);
    setReplyTarget(null);
    setMessageText(getReadableMessageText(item.text));
    setFavoriteContextMenu(null);
    setErrorMessage("");

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  }

  function togglePinnedFavoriteItem(item: FavoriteItem) {
    setPinnedFavoriteItem((currentPinnedItem) =>
      currentPinnedItem?.id === item.id ? null : item,
    );
    setFavoriteContextMenu(null);
    setErrorMessage("");
  }

  function toggleSelectedFavoriteItem(item: FavoriteItem) {
    setSelectedMessageIds((currentIds) =>
      currentIds.includes(item.id)
        ? currentIds.filter((id) => id !== item.id)
        : [...currentIds, item.id],
    );
    setFavoriteContextMenu(null);
    setErrorMessage("");
  }

  function replyToMessage(message: MessageRow) {
    setReplyTarget(message);
    setEditingMessage(null);
    setMessageText("");
    setMessageContextMenu(null);
    setErrorMessage("");

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  }

  function scrollToReplyMessage(reply: ReplyMessagePayload) {
    if (!reply.messageId) {
      setErrorMessage("Рљ СЌС‚РѕРјСѓ СЃС‚Р°СЂРѕРјСѓ РѕС‚РІРµС‚Сѓ РЅРµР»СЊР·СЏ РїРµСЂРµР№С‚Рё: РѕРЅ Р±С‹Р» СЃРѕР·РґР°РЅ РґРѕ РїСЂРёРІСЏР·РєРё СЃРѕРѕР±С‰РµРЅРёР№.");
      return;
    }

    const targetMessage = messagesListRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${reply.messageId}"]`,
    );

    if (!targetMessage) {
      setErrorMessage("РСЃС…РѕРґРЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ РЅРµ РЅР°Р№РґРµРЅРѕ.");
      return;
    }

    if (highlightedMessageTimeoutRef.current !== null) {
      window.clearTimeout(highlightedMessageTimeoutRef.current);
    }

    targetMessage.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(reply.messageId);
    setErrorMessage("");
    highlightedMessageTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId(null);
      highlightedMessageTimeoutRef.current = null;
    }, 1200);
  }

  function highlightMessage(messageId: number) {
    const targetMessage = messagesListRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    );

    if (!targetMessage) {
      return false;
    }

    if (highlightedMessageTimeoutRef.current !== null) {
      window.clearTimeout(highlightedMessageTimeoutRef.current);
    }

    targetMessage.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    highlightedMessageTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId(null);
      highlightedMessageTimeoutRef.current = null;
    }, 1200);

    return true;
  }

  function scrollToNextPinnedMessage() {
    if (activePinnedMessages.length === 0) {
      return;
    }

    if (isPinnedMessagesViewOpen) {
      setIsPinnedMessagesViewOpen(false);
    }

    window.requestAnimationFrame(() => {
      const nextIndex = pinnedNavigationIndex % activePinnedMessages.length;
      const nextPinnedMessage = activePinnedMessages[nextIndex];

      if (nextPinnedMessage && highlightMessage(nextPinnedMessage.id)) {
        setPinnedNavigationIndex((nextIndex + 1) % activePinnedMessages.length);
      }
    });
  }

  function startEditingMessage(message: MessageRow) {
    if (!user || message.user_id !== user.id) {
      setErrorMessage("РњРѕР¶РЅРѕ РёР·РјРµРЅСЏС‚СЊ С‚РѕР»СЊРєРѕ СЃРІРѕРё СЃРѕРѕР±С‰РµРЅРёСЏ.");
      setMessageContextMenu(null);
      return;
    }

    setEditingMessage(message);
    setReplyTarget(null);
    setMessageText(getReadableMessageText(message.text));
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  function requestPinnedMessage(message: MessageRow) {
    setMessagePinTarget(message);
    setShouldPinForBoth(false);
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  function removeLocalPinnedMessageId(messageId: number, chatUserId = selectedChatUserId) {
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

    setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
    writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
  }

  function requestUnpinPinnedMessage(message: MessageRow) {
    setMessagePinTarget(message);
    setShouldPinForBoth(sharedPinnedMessageIds.has(message.id));
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  async function confirmUnpinPinnedMessage() {
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

      setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
    }

    if (wasSharedPinned) {
      setShouldPinForBoth(true);
      await confirmPinnedMessage();
      return;
    }

    setMessagePinTarget(null);
    setErrorMessage("");
  }

  async function confirmPinnedMessage() {
    if (!messagePinTarget) {
      return;
    }

    const isSharedPinned = sharedPinnedMessageIds.has(messagePinTarget.id);
    const isPinned = activePinnedMessageIdSet.has(messagePinTarget.id);

    if (!shouldPinForBoth) {
      if (!user || !selectedChatUserId) {
        setErrorMessage("РЎРЅР°С‡Р°Р»Р° РѕС‚РєСЂРѕР№ РЅСѓР¶РЅС‹Р№ С‡Р°С‚.");
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

      setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
      setMessagePinTarget(null);
      setErrorMessage("");
      return;
    }

    if (!user) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРё РІ Р°РєРєР°СѓРЅС‚.");
      return;
    }

    if (!selectedChatUserId) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РѕС‚РєСЂРѕР№ РЅСѓР¶РЅС‹Р№ С‡Р°С‚.");
      return;
    }

    const action: PinMessagePayload["action"] = isSharedPinned ? "unpin" : "pin";
    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      recipient_id: selectedChatUserId,
      text: createPinMessageText(messagePinTarget.id, action),
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessagePinTarget(null);
    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        recipient_id: selectedChatUserId,
        text: optimisticMessage.text,
        user_id: user.id,
      })
      .select(messageColumns)
      .single();

    if (error || !data) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ Р·Р°РєСЂРµРїР»РµРЅРёРµ РґР»СЏ РґРІРѕРёС….");
      return;
    }

    setMessages((currentMessages) =>
      mergeMessages(
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
        [data],
      ),
    );
    setErrorMessage("");
  }

  async function unpinAllActivePinnedMessages() {
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

    setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
    writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);

    if (sharedPinnedIds.length === 0) {
      setIsPinnedMessagesViewOpen(false);
      setErrorMessage("");
      return;
    }

    const optimisticMessages = sharedPinnedIds.map((messageId, index) => ({
      id: -(Date.now() + index),
      author: activeUserName,
      recipient_id: selectedChatUserId,
      text: createPinMessageText(messageId, "unpin"),
      created_at: new Date(Date.now() + index).toISOString(),
      user_id: user.id,
    }));

    setMessages((currentMessages) => mergeMessages(currentMessages, optimisticMessages));

    const { data, error } = await supabase
      .from("messages")
      .insert(
        optimisticMessages.map((message) => ({
          author: activeUserName,
          recipient_id: selectedChatUserId,
          text: message.text,
          user_id: user.id,
        })),
      )
      .select(messageColumns);

    if (error) {
      setPinnedMessageIdsByChat(previousPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, previousPinnedMessageIdsByChat);
      setMessages((currentMessages) =>
        currentMessages.filter(
          (message) => !optimisticMessages.some((optimisticMessage) => optimisticMessage.id === message.id),
        ),
      );
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РѕС‚РєСЂРµРїРёС‚СЊ РѕР±С‰РёРµ Р·Р°РєСЂРµРїС‹.");
      return;
    }

    setMessages((currentMessages) =>
      mergeMessages(
        currentMessages.filter(
          (message) => !optimisticMessages.some((optimisticMessage) => optimisticMessage.id === message.id),
        ),
        data ?? [],
      ),
    );
    setIsPinnedMessagesViewOpen(false);
    setErrorMessage("");
  }

  function toggleSelectedMessage(message: MessageRow) {
    setSelectedMessageIds((currentIds) =>
      currentIds.includes(message.id)
        ? currentIds.filter((id) => id !== message.id)
        : [...currentIds, message.id],
    );
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  function handleMessageSelectionClick(
    event: MouseEvent<HTMLElement>,
    message: MessageRow,
  ) {
    if (!isMessageSelectionMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleSelectedMessage(message);
  }

  function forwardSelectedMessages() {
    if (selectedDialogMessages.length === 0) {
      return;
    }

    setErrorMessage("РџРµСЂРµСЃС‹Р»РєСѓ СЃРѕРѕР±С‰РµРЅРёР№ РїРѕРґРєР»СЋС‡РёРј СЃР»РµРґСѓСЋС‰РёРј С€Р°РіРѕРј.");
  }

  function hideSelectedMessagesForMe() {
    if (!user || selectedDialogMessages.length === 0) {
      return;
    }

    const selectedIds = selectedDialogMessages.map((message) => message.id);
    const positiveIds = selectedIds.filter((id) => id > 0);
    const localIds = selectedIds.filter((id) => id < 0);

    setIsSelectedDeleteDialogOpen(false);
    setMessages((currentMessages) =>
      currentMessages.filter((message) => !localIds.includes(message.id)),
    );

    if (positiveIds.length > 0) {
      setHiddenMessageIds((currentIds) => {
        const nextIds = Array.from(new Set([...currentIds, ...positiveIds]));

        window.localStorage.setItem(
          "twinline-hidden-messages-" + user.id,
          JSON.stringify(nextIds),
        );

        return nextIds;
      });
    }

    if (selectedChatUserId) {
      const nextPinnedMessageIdsByChat = {
        ...pinnedMessageIdsByChat,
        [selectedChatUserId]: (pinnedMessageIdsByChat[selectedChatUserId] ?? []).filter(
          (id) => !selectedIds.includes(id),
        ),
      };

      setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
    }

    setSelectedMessageIds((currentIds) =>
      currentIds.filter((id) => !selectedIds.includes(id)),
    );
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  async function deleteSelectedMessagesForBoth() {
    if (!user || selectedDialogMessages.length === 0) {
      return;
    }

    const selectedIds = selectedDialogMessages.map((message) => message.id);
    const positiveIds = selectedIds.filter((id) => id > 0);
    const previousMessages = messages;
    const previousPinnedMessageIdsByChat = pinnedMessageIdsByChat;
    const previousSelectedMessageIds = selectedMessageIds;

    setIsSelectedDeleteDialogOpen(false);
    setMessages((currentMessages) =>
      currentMessages.filter((message) => !selectedIds.includes(message.id)),
    );

    if (selectedChatUserId) {
      const nextPinnedMessageIdsByChat = {
        ...pinnedMessageIdsByChat,
        [selectedChatUserId]: (pinnedMessageIdsByChat[selectedChatUserId] ?? []).filter(
          (id) => !selectedIds.includes(id),
        ),
      };

      setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
    }

    setSelectedMessageIds((currentIds) =>
      currentIds.filter((id) => !selectedIds.includes(id)),
    );
    setMessageContextMenu(null);

    if (positiveIds.length === 0) {
      setErrorMessage("");
      return;
    }

    const { error } = await supabase
      .from("messages")
      .delete()
      .in("id", positiveIds);

    if (error) {
      setMessages(previousMessages);
      setPinnedMessageIdsByChat(previousPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, previousPinnedMessageIdsByChat);
      setSelectedMessageIds(previousSelectedMessageIds);
      setErrorMessage("\u041d\u0435 \u043f\u043e\u043b\u0443\u0447\u0438\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0432\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f \u0443 \u0434\u0432\u043e\u0438\u0445.");
      return;
    }

    setErrorMessage("");
  }

  function requestMessageDelete(message: MessageRow) {
    setMessageDeleteTarget(message);
    setMessageContextMenu(null);
  }

  function startCallPanelDrag(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    callPanelDragRef.current = {
      left: callPanelPosition.left,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      top: callPanelPosition.top,
    };
  }

  function dragCallPanel(event: PointerEvent<HTMLElement>) {
    if (callPanelDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const nextPosition = {
      left: callPanelDragRef.current.left + event.clientX - callPanelDragRef.current.startX,
      top: callPanelDragRef.current.top + event.clientY - callPanelDragRef.current.startY,
    };

    setCallPanelPosition(clampPanelPosition(nextPosition, isCallPanelCollapsed));
  }

  function stopCallPanelDrag(event: PointerEvent<HTMLElement>) {
    if (callPanelDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    callPanelDragRef.current.pointerId = 0;
  }

  async function updateProfileName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const nextName = profileName.trim();

    if (!nextName || nextName === activeUserName) {
      return;
    }

    if (nextName.length < 2 || nextName.length > 24) {
      setErrorMessage("РРјСЏ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РѕС‚ 2 РґРѕ 24 СЃРёРјРІРѕР»РѕРІ.");
      return;
    }

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        avatar_url: currentProfile?.avatar_url ?? null,
        display_name: nextName,
        name_changed_at: currentProfile?.name_changed_at ?? null,
        updated_at: updatedAt,
        user_id: user.id,
        username: currentProfile?.username ?? null,
        username_changed_at: currentProfile?.username_changed_at ?? null,
      })
      .select(profileColumns)
      .single();

    if (error) {
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РёР·РјРµРЅРёС‚СЊ РёРјСЏ.");
      return;
    }

    if (data) {
      setProfiles((currentProfiles) => {
        const withoutProfile = currentProfiles.filter(
          (profile) => profile.user_id !== data.user_id,
        );

        return [...withoutProfile, data];
      });
    }

    await supabase.auth.updateUser({
      data: {
        display_name: nextName,
      },
    });

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.user_id === user.id ? { ...message, author: nextName } : message,
      ),
    );
    setProfileName("");
    setErrorMessage("");
  }

  async function updateProfileUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setProfileUsernameError("");

    const nextUsername = normalizeUsername(profileUsernameInputValue);
    const usernameValidationError = getUsernameError(nextUsername);

    if (usernameValidationError) {
      setProfileUsernameError(usernameValidationError);
      return;
    }

    if (nextUsername === currentProfile?.username) {
      return;
    }

    if (!isUsernameChangeAllowed) {
      setProfileUsernameError(
        `РќРёРє СЃРЅРѕРІР° РјРѕР¶РЅРѕ Р±СѓРґРµС‚ РёР·РјРµРЅРёС‚СЊ ${nextUsernameChangeDate ?? "РїРѕР·Р¶Рµ"}.`,
      );
      return;
    }

    const usernameOwner = await fetchUsernameOwner(nextUsername);

    if (usernameOwner.error) {
      setProfileUsernameError("РЎРЅР°С‡Р°Р»Р° РЅСѓР¶РЅРѕ РґРѕР±Р°РІРёС‚СЊ РєРѕР»РѕРЅРєСѓ username РІ Supabase.");
      return;
    }

    if (usernameOwner.data && usernameOwner.data.user_id !== user.id) {
      setProfileUsernameError("РўР°РєРѕР№ РЅРёРє СѓР¶Рµ Р·Р°РЅСЏС‚.");
      return;
    }

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        avatar_url: currentProfile?.avatar_url ?? null,
        display_name: activeUserName,
        name_changed_at: updatedAt,
        updated_at: updatedAt,
        user_id: user.id,
        username: nextUsername,
        username_changed_at: updatedAt,
      })
      .select(profileColumns)
      .single();

    if (error) {
      setProfileUsernameError("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РЅРёРє.");
      return;
    }

    if (data) {
      setProfiles((currentProfiles) => {
        const withoutProfile = currentProfiles.filter(
          (profile) => profile.user_id !== data.user_id,
        );

        return [...withoutProfile, data];
      });
    }

    await supabase.auth.updateUser({
      data: {
        username: nextUsername,
      },
    });

    setProfileUsername(null);
    setErrorMessage("");
  }
  function handleMessageTextChange(event: ChangeEvent<HTMLInputElement>) {
    const nextMessageText = event.target.value;

    setMessageText(nextMessageText);

    if (!user || editingMessage || activeView === "favorites") {
      return;
    }

    if (!nextMessageText.trim()) {
      typingSentAtRef.current = 0;
      void sendTypingState("stop");
      return;
    }

    const now = Date.now();

    if (now - typingSentAtRef.current < 900) {
      return;
    }

    typingSentAtRef.current = now;
    void sendTypingState("start");
  }
  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРё РІ Р°РєРєР°СѓРЅС‚.");
      return;
    }

    const trimmedText = messageText.trim();

    if (!trimmedText) {
      return;
    }

    if (activeView === "favorites") {
      if (editingMessage) {
        const editedText = updateReplyMessageBody(editingMessage.text, trimmedText);
        const updatedFavoriteItem: FavoriteItem = {
          ...(editingMessage as FavoriteItem),
          text: editedText,
        };

        saveFavoriteItems(
          favoriteItems.map((favoriteItem) =>
            favoriteItem.id === editingMessage.id ? updatedFavoriteItem : favoriteItem,
          ),
        );
        setPinnedFavoriteItem((currentPinnedItem) =>
          currentPinnedItem?.id === editingMessage.id ? updatedFavoriteItem : currentPinnedItem,
        );
        setEditingMessage(null);
        setMessageText("");
        setErrorMessage("");
        return;
      }

      addFavoriteChatMessage(
        replyTarget ? createReplyMessageText(replyTarget, trimmedText) : trimmedText,
      );
      setMessageText("");
      setReplyTarget(null);
      return;
    }

    if (!selectedChatUserId) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРё СЃРѕР±РµСЃРµРґРЅРёРєР°.");
      return;
    }

    if (isSelectedChatBlockedByMe) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° СЂР°Р·Р±Р»РѕРєРёСЂСѓР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ, С‡С‚РѕР±С‹ РЅР°РїРёСЃР°С‚СЊ РµРјСѓ.");
      return;
    }

    if (isSelectedChatBlockingMe) {
      setErrorMessage("РўС‹ РЅРµ РјРѕР¶РµС€СЊ РЅР°РїРёСЃР°С‚СЊ: РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ С‚РµР±СЏ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°Р».");
      return;
    }

    typingSentAtRef.current = 0;
    void sendTypingState("stop");

    if (editingMessage) {
      const previousMessages = messages;
      const editedText = updateReplyMessageBody(editingMessage.text, trimmedText);
      const updatedMessage: MessageRow = {
        ...editingMessage,
        text: editedText,
      };

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === editingMessage.id ? updatedMessage : message,
        ),
      );
      setEditingMessage(null);
      setMessageText("");

      const { data, error } = await supabase
        .from("messages")
        .update({ text: editedText })
        .eq("id", editingMessage.id)
        .eq("user_id", user.id)
        .select(messageColumns)
        .maybeSingle();

      if (error || !data) {
        setMessages(previousMessages);
        setEditingMessage(editingMessage);
        setMessageText(trimmedText);
        setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РёР·РјРµРЅРёС‚СЊ СЃРѕРѕР±С‰РµРЅРёРµ. Р’РѕР·РјРѕР¶РЅРѕ, РЅСѓР¶РЅРѕ СЂР°Р·СЂРµС€РёС‚СЊ UPDATE РІ Supabase.");
      } else {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === data.id ? data : message,
          ),
        );
        setErrorMessage("");
      }

      return;
    }

    const outgoingText = replyTarget
      ? createReplyMessageText(replyTarget, trimmedText)
      : trimmedText;

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      recipient_id: selectedChatUserId,
      text: outgoingText,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessageText("");
    setReplyTarget(null);
    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        recipient_id: selectedChatUserId,
        text: outgoingText,
        user_id: user.id,
      })
      .select(messageColumns)
      .single();

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setMessageText(trimmedText);
      setReplyTarget(replyTarget);
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ СЃРѕРѕР±С‰РµРЅРёРµ.");
    } else {
      setMessages((currentMessages) => {
        const withoutOptimisticMessage = currentMessages.filter(
          (message) => message.id !== optimisticMessage.id,
        );

        return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
      });
      setErrorMessage("");
    }
  }

  async function sendSticker(sticker: string) {
    if (!user) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРё РІ Р°РєРєР°СѓРЅС‚.");
      return;
    }

    const stickerText = `${stickerMessagePrefix}${sticker}`;

    if (activeView === "favorites") {
      addFavoriteChatMessage(stickerText);
      setIsStickerPickerOpen(false);
      return;
    }

    if (!selectedChatUserId) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРё СЃРѕР±РµСЃРµРґРЅРёРєР°.");
      setIsStickerPickerOpen(false);
      return;
    }

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      recipient_id: selectedChatUserId,
      text: stickerText,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setIsStickerPickerOpen(false);
    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        recipient_id: selectedChatUserId,
        text: stickerText,
        user_id: user.id,
      })
      .select(messageColumns)
      .single();

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ СЃС‚РёРєРµСЂ.");
      return;
    }

    setMessages((currentMessages) => {
      const withoutOptimisticMessage = currentMessages.filter(
        (message) => message.id !== optimisticMessage.id,
      );

      return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
    });
    setErrorMessage("");
  }

  async function sendAttachment(file: File) {
    if (!user) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРё РІ Р°РєРєР°СѓРЅС‚.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (file.size > maxAttachmentSize) {
      setErrorMessage("Р¤Р°Р№Р» РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РјРµРЅСЊС€Рµ 50 РњР‘.");
      return;
    }

    setIsUploadingAttachment(true);
    setErrorMessage("");

    const fileExtension = getSafeFileExtension(file.name);
    const filePath = `${user.id}/${getAttachmentFolder(file)}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Hush file upload failed:", uploadError.message);
      setIsUploadingAttachment(false);
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ С„Р°Р№Р».");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const attachmentUrl = publicUrlData.publicUrl;
    const messageText = isImage
      ? `${imageMessagePrefix}${attachmentUrl}`
      : isVideo
        ? `${videoMessagePrefix}${attachmentUrl}`
        : createFileMessageText({
            name: file.name || "Р¤Р°Р№Р»",
            size: file.size,
            type: file.type,
            url: attachmentUrl,
          });

    if (activeView === "favorites") {
      addFavoriteChatMessage(messageText);
      setIsUploadingAttachment(false);
      return;
    }

    if (!selectedChatUserId) {
      setIsUploadingAttachment(false);
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРё СЃРѕР±РµСЃРµРґРЅРёРєР°.");
      return;
    }

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      recipient_id: selectedChatUserId,
      text: messageText,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        recipient_id: selectedChatUserId,
        text: messageText,
        user_id: user.id,
      })
      .select(messageColumns)
      .single();

    setIsUploadingAttachment(false);

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ С„Р°Р№Р».");
    } else {
      setMessages((currentMessages) => {
        const withoutOptimisticMessage = currentMessages.filter(
          (message) => message.id !== optimisticMessage.id,
        );

        return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
      });
    }
  }

  async function sendVoiceMessage(audioBlob: Blob) {
    if (!user) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРё РІ Р°РєРєР°СѓРЅС‚.");
      return;
    }

    if (audioBlob.size > maxAttachmentSize) {
      setErrorMessage("Р“РѕР»РѕСЃРѕРІРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РјРµРЅСЊС€Рµ 50 РњР‘.");
      return;
    }

    setIsUploadingAttachment(true);
    setErrorMessage("");

    const filePath = `${user.id}/voice-${Date.now()}-${crypto.randomUUID()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, audioBlob, {
        cacheControl: "3600",
        contentType: audioBlob.type || "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingAttachment(false);
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РіРѕР»РѕСЃРѕРІРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    if (activeView === "favorites") {
      addFavoriteChatMessage(`${audioMessagePrefix}${publicUrlData.publicUrl}`);
      setIsUploadingAttachment(false);
      return;
    }

    if (!selectedChatUserId) {
      setIsUploadingAttachment(false);
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРё СЃРѕР±РµСЃРµРґРЅРёРєР°.");
      return;
    }

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      recipient_id: selectedChatUserId,
      text: `${audioMessagePrefix}${publicUrlData.publicUrl}`,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        recipient_id: selectedChatUserId,
        text: `${audioMessagePrefix}${publicUrlData.publicUrl}`,
        user_id: user.id,
      })
      .select(messageColumns)
      .single();

    setIsUploadingAttachment(false);

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ РіРѕР»РѕСЃРѕРІРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ.");
    } else {
      setMessages((currentMessages) => {
        const withoutOptimisticMessage = currentMessages.filter(
          (message) => message.id !== optimisticMessage.id,
        );

        return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
      });
    }
  }

  function stopVoiceInputMeter() {
    if (recordingAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(recordingAnimationFrameRef.current);
      recordingAnimationFrameRef.current = null;
    }

    void recordingAudioContextRef.current?.close();
    recordingAudioContextRef.current = null;
    setVoiceInputLevel(0);
  }

  function startVoiceInputMeter(stream: MediaStream) {
    stopVoiceInputMeter();

    try {
      const AudioContextClass = window.AudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      let lastLevel = 0;

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      const dataArray = new Uint8Array(analyser.fftSize);
      source.connect(analyser);
      recordingAudioContextRef.current = audioContext;

      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;

        for (const value of dataArray) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }

        const volume = Math.sqrt(sum / dataArray.length);
        const nextLevel = Math.min(1, Math.max(0, (volume - 0.004) * 22));

        if (Math.abs(nextLevel - lastLevel) > 0.012) {
          lastLevel = nextLevel;
          setVoiceInputLevel(nextLevel);
        }

        recordingAnimationFrameRef.current = window.requestAnimationFrame(tick);
      };

      tick();
    } catch {
      setVoiceInputLevel(0);
    }
  }

  async function startVoiceRecording() {
    if (!user) {
      setErrorMessage("РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРё РІ Р°РєРєР°СѓРЅС‚.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Р‘СЂР°СѓР·РµСЂ РЅРµ РїРѕРґРґРµСЂР¶РёРІР°РµС‚ Р·Р°РїРёСЃСЊ РіРѕР»РѕСЃР°.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      shouldDiscardRecordingRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopVoiceInputMeter();
        const audioBlob = new Blob(recordingChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        recordingChunksRef.current = [];
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        setVoiceRecordingStartedAt(null);
        setVoiceRecordingDuration(0);

        if (!shouldDiscardRecordingRef.current && audioBlob.size > 0) {
          sendVoiceMessage(audioBlob);
        }

        shouldDiscardRecordingRef.current = false;
      };

      mediaRecorder.start();
      startVoiceInputMeter(stream);
      setIsRecordingVoice(true);
      setVoiceRecordingStartedAt(Date.now());
      setVoiceRecordingDuration(0);
      setErrorMessage("");
    } catch {
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РґРѕСЃС‚СѓРї Рє РјРёРєСЂРѕС„РѕРЅСѓ.");
    }
  }

  function stopVoiceRecording() {
    const mediaRecorder = mediaRecorderRef.current;

    if (!mediaRecorder) {
      return;
    }

    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    setIsRecordingVoice(false);
  }

  function cancelVoiceRecording() {
    const mediaRecorder = mediaRecorderRef.current;

    shouldDiscardRecordingRef.current = true;

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    } else {
      stopVoiceInputMeter();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      mediaRecorderRef.current = null;
      recordingChunksRef.current = [];
      shouldDiscardRecordingRef.current = false;
    }

    setIsRecordingVoice(false);
    setVoiceRecordingStartedAt(null);
    setVoiceRecordingDuration(0);
    setErrorMessage("");
  }

  function toggleVoiceRecording() {
    if (isRecordingVoice) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    for (const file of files) {
      await sendAttachment(file);
    }

    event.target.value = "";
  }

  async function deleteMessage(message: MessageRow) {
    setMessageContextMenu(null);
    setMessageDeleteTarget(null);

    if (!user || message.user_id !== user.id) {
      setErrorMessage("РњРѕР¶РЅРѕ СѓРґР°Р»СЏС‚СЊ С‚РѕР»СЊРєРѕ СЃРІРѕРё СЃРѕРѕР±С‰РµРЅРёСЏ.");
      return;
    }

    const previousMessages = messages;

    setMessages((currentMessages) =>
      currentMessages.filter((currentMessage) => currentMessage.id !== message.id),
    );

    const { data, error } = await supabase
      .from("messages")
      .delete()
      .eq("id", message.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setMessages(previousMessages);
      setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ СЃРѕРѕР±С‰РµРЅРёРµ РёР· Р±Р°Р·С‹.");
    } else {
      removeLocalPinnedMessageId(message.id, message.user_id === user.id ? selectedChatUserId : message.user_id);
      setSelectedMessageIds((currentIds) =>
        currentIds.filter((id) => id !== message.id),
      );
      setErrorMessage("");
    }
  }

  function hideMessageForMe(message: MessageRow) {
    if (!user) {
      return;
    }

    setHiddenMessageIds((currentIds) => {
      const nextIds = currentIds.includes(message.id)
        ? currentIds
        : [...currentIds, message.id];

      window.localStorage.setItem(
        `twinline-hidden-messages-${user.id}`,
        JSON.stringify(nextIds),
      );

      return nextIds;
    });
    setMessageDeleteTarget(null);
    removeLocalPinnedMessageId(message.id, message.user_id === user.id ? selectedChatUserId : message.user_id);
    setSelectedMessageIds((currentIds) =>
      currentIds.filter((id) => id !== message.id),
    );
    setErrorMessage("");
  }

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <AuthScreen
        authContactMethod={authContactMethod}
        authEmail={authEmail}
        authMode={authMode}
        authPassword={authPassword}
        authPhone={authPhone}
        authUsername={authUsername}
        authUsernameError={authUsernameError}
        errorMessage={errorMessage}
        isLightThemeEnabled={isLightThemeEnabled}
        onSubmit={handleAuth}
        setAuthContactMethod={setAuthContactMethod}
        setAuthEmail={setAuthEmail}
        setAuthMode={setAuthMode}
        setAuthPassword={setAuthPassword}
        setAuthPhone={setAuthPhone}
        setAuthUsername={setAuthUsername}
        setAuthUsernameError={setAuthUsernameError}
        setErrorMessage={setErrorMessage}
      />
    );
  }

  return (
    <>
    <AppShell
      activeView={activeView}
      chatSearchQuery={chatSearchQuery}
      isLightThemeEnabled={isLightThemeEnabled}
      searchableProfiles={searchableProfiles}
      setActiveView={setActiveView}
      setChatSearchQuery={setChatSearchQuery}
      setSelectedChatUserId={setSelectedChatUserId}
      setUnreadMessageCount={setUnreadMessageCount}
      setViewedProfile={setViewedProfile}
      totalUnreadMessageCount={totalUnreadMessageCount}
    >
      {activeView === "profile" ? (
        <ProfileView
          activeUserName={activeUserName}
          avatarInputRef={avatarInputRef}
          currentProfile={currentProfile}
          handleAvatarChange={handleAvatarChange}
          isUploadingAvatar={isUploadingAvatar}
          isUsernameChangeAllowed={isUsernameChangeAllowed}
          nextUsernameChangeDate={nextUsernameChangeDate}
          openAvatarGallery={openAvatarGallery}
          profileName={profileName}
          profileNameInputValue={profileNameInputValue}
          profileUsernameError={profileUsernameError}
          profileUsernameInputValue={profileUsernameInputValue}
          setProfileName={setProfileName}
          setProfileUsername={setProfileUsername}
          setProfileUsernameError={setProfileUsernameError}
          updateProfileName={updateProfileName}
          updateProfileUsername={updateProfileUsername}
          user={user}
        />
      ) : activeView === "favorites" ? (
        <FavoritesView
          cancelVoiceRecording={cancelVoiceRecording}
          editingMessage={editingMessage}
          favoriteItems={favoriteItems}
          friendProfile={friendProfile}
          getReadableMessageText={getReadableMessageText}
          handleAttachmentChange={handleAttachmentChange}
          handleMessageTextChange={handleMessageTextChange}
          imageInputRef={imageInputRef}
          isPinnedMessagesViewOpen={isPinnedMessagesViewOpen}
          isRecordingVoice={isRecordingVoice}
          isSelectedChatBlocked={isSelectedChatBlocked}
          isSelectedChatBlockedByMe={isSelectedChatBlockedByMe}
          isUploadingAttachment={isUploadingAttachment}
          messageInputRef={messageInputRef}
          messageText={messageText}
          openFavoriteContextMenu={openFavoriteContextMenu}
          pinnedFavoriteItem={pinnedFavoriteItem}
          replyTarget={replyTarget}
          requestBlockChange={requestBlockChange}
          selectedChatUserId={selectedChatUserId}
          selectedMessageIdSet={selectedMessageIdSet}
          sendMessage={sendMessage}
          setEditingMessage={setEditingMessage}
          setMessageText={setMessageText}
          setPinnedFavoriteItem={setPinnedFavoriteItem}
          setReplyTarget={setReplyTarget}
          setSelectedImageUrl={setSelectedImageUrl}
          stickerButtonRef={stickerButtonRef}
          toggleStickerPicker={toggleStickerPicker}
          toggleVoiceRecording={toggleVoiceRecording}
          voiceInputLevel={voiceInputLevel}
          voiceRecordingDuration={voiceRecordingDuration}
        />
      ) : activeView === "settings" ? (
        <SettingsView
          activeUserName={activeUserName}
          areNotificationsEnabled={areNotificationsEnabled}
          areSoftEffectsEnabled={areSoftEffectsEnabled}
          blockedByMeProfiles={blockedByMeProfiles}
          currentProfile={currentProfile}
          handleSignOut={handleSignOut}
          isLightThemeEnabled={isLightThemeEnabled}
          isOnlineStatusVisible={isOnlineStatusVisible}
          isPhoneVisible={isPhoneVisible}
          isProfileSearchable={isProfileSearchable}
          isSigningOut={isSigningOut}
          mutedProfiles={mutedProfiles}
          requestBlockChange={requestBlockChange}
          setAreSoftEffectsEnabled={setAreSoftEffectsEnabled}
          setIsLightThemeEnabled={setIsLightThemeEnabled}
          setIsOnlineStatusVisible={setIsOnlineStatusVisible}
          setIsPhoneVisible={setIsPhoneVisible}
          setIsProfileSearchable={setIsProfileSearchable}
          toggleNotifications={toggleNotifications}
          toggleStoredBooleanSetting={toggleStoredBooleanSetting}
          userEmail={user.email}
        />
      ) : selectedChatUserId === null ? (
        <ChatListView
          chatProfiles={chatProfiles}
          latestVisibleMessageByProfileId={latestVisibleMessageByProfileId}
          openChatContextMenu={openChatContextMenu}
          setSelectedChatUserId={setSelectedChatUserId}
          setUnreadMessageCount={setUnreadMessageCount}
          unreadMessagesByUserId={unreadMessagesByUserId}
        />
      ) : (
        <OpenChatView
          activePinnedMessageIdSet={activePinnedMessageIdSet}
          activePinnedMessages={activePinnedMessages}
          activeUserName={activeUserName}
          callStatus={callStatus}
          callStatusText={callStatusText}
          cancelVoiceRecording={cancelVoiceRecording}
          currentProfile={currentProfile}
          editingMessage={editingMessage}
          errorMessage={errorMessage}
          forwardSelectedMessages={forwardSelectedMessages}
          friendProfile={friendProfile}
          getReadableMessageText={getReadableMessageText}
          handleAttachmentChange={handleAttachmentChange}
          handleMessageSelectionClick={handleMessageSelectionClick}
          handleMessageTextChange={handleMessageTextChange}
          highlightedMessageId={highlightedMessageId}
          imageInputRef={imageInputRef}
          isDeletingChat={isDeletingChat}
          isFriendTyping={isFriendTyping}
          isLoadingMessages={isLoadingMessages}
          isMessageSelectionMode={isMessageSelectionMode}
          isPinnedMessagesViewOpen={isPinnedMessagesViewOpen}
          isRecordingVoice={isRecordingVoice}
          isSelectedChatBlocked={isSelectedChatBlocked}
          isSelectedChatBlockedByMe={isSelectedChatBlockedByMe}
          isSelectedChatBlockingMe={isSelectedChatBlockingMe}
          isUploadingAttachment={isUploadingAttachment}
          messageInputRef={messageInputRef}
          messageReceiptStatuses={messageReceiptStatuses}
          messageText={messageText}
          messagesListRef={messagesListRef}
          openMessageContextMenu={openMessageContextMenu}
          profilesByUserId={profilesByUserId}
          replyTarget={replyTarget}
          scrollToNextPinnedMessage={scrollToNextPinnedMessage}
          scrollToReplyMessage={scrollToReplyMessage}
          selectedChatUserId={selectedChatUserId}
          selectedDialogMessages={selectedDialogMessages}
          selectedMessageIdSet={selectedMessageIdSet}
          sendMessage={sendMessage}
          setChatDeleteTargetUserId={setChatDeleteTargetUserId}
          setEditingMessage={setEditingMessage}
          setIsChatDeleteDialogOpen={setIsChatDeleteDialogOpen}
          setIsPinnedMessagesViewOpen={setIsPinnedMessagesViewOpen}
          setIsSelectedDeleteDialogOpen={setIsSelectedDeleteDialogOpen}
          setIsUnpinAllDialogOpen={setIsUnpinAllDialogOpen}
          setMessageText={setMessageText}
          setReplyTarget={setReplyTarget}
          setSelectedChatUserId={setSelectedChatUserId}
          setSelectedImageUrl={setSelectedImageUrl}
          setViewedProfile={setViewedProfile}
          startCall={startCall}
          stickerButtonRef={stickerButtonRef}
          toggleStickerPicker={toggleStickerPicker}
          toggleVoiceRecording={toggleVoiceRecording}
          user={user}
          visibleDialogMessages={visibleDialogMessages}
          visibleDialogMessagesCount={visibleDialogMessagesCount}
          voiceInputLevel={voiceInputLevel}
          voiceRecordingDuration={voiceRecordingDuration}
        />
      )}
    </AppShell>
      <audio autoPlay playsInline ref={remoteAudioRef} />
      <CallPanel
        acceptCall={acceptCall}
        callDuration={callDuration}
        callPanelPosition={callPanelPosition}
        callPanelProfile={callPanelProfile}
        callStatus={callStatus}
        callStatusText={callStatusText}
        closeCall={closeCall}
        dragCallPanel={dragCallPanel}
        isCallMicMuted={isCallMicMuted}
        isCallPanelCollapsed={isCallPanelCollapsed}
        setIsCallPanelCollapsed={setIsCallPanelCollapsed}
        startCallPanelDrag={startCallPanelDrag}
        stopCallPanelDrag={stopCallPanelDrag}
        toggleCallMicrophone={toggleCallMicrophone}
      />
      <AvatarGalleryOverlay
        avatarGalleryIndex={avatarGalleryIndex}
        avatarGalleryItems={avatarGalleryItems}
        avatarGalleryUrl={avatarGalleryUrl}
        canDeleteAvatarFromGallery={canDeleteAvatarFromGallery}
        onClose={() => setAvatarGalleryIndex(null)}
        setAvatarGalleryIndex={setAvatarGalleryIndex}
        setIsAvatarDeleteDialogOpen={setIsAvatarDeleteDialogOpen}
      />
      <AvatarDeleteDialog
        isOpen={isAvatarDeleteDialogOpen && Boolean(avatarGalleryUrl)}
        onCancel={() => setIsAvatarDeleteDialogOpen(false)}
        onConfirm={() => void deleteAvatarFromGallery()}
      />
      <ImagePreviewOverlay
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
      <ChatContextMenu
        blockedByMeProfileIds={blockedByMeProfileIds}
        contextMenu={chatContextMenu}
        muteProfileNotifications={muteProfileNotifications}
        mutedProfiles={mutedProfiles}
        requestBlockChange={requestBlockChange}
        requestChatDeleteFromMenu={requestChatDeleteFromMenu}
        runChatMenuStub={runChatMenuStub}
        setChatContextMenu={setChatContextMenu}
        unmuteProfileNotifications={unmuteProfileNotifications}
      />
      <MessageContextMenu
        activePinnedMessageIdSet={activePinnedMessageIdSet}
        contextMenu={messageContextMenu}
        copyMessageText={copyMessageText}
        currentUserId={user?.id}
        replyToMessage={replyToMessage}
        requestMessageDelete={requestMessageDelete}
        requestPinnedMessage={requestPinnedMessage}
        requestUnpinPinnedMessage={requestUnpinPinnedMessage}
        selectedMessageIdSet={selectedMessageIdSet}
        setMessageContextMenu={setMessageContextMenu}
        startEditingMessage={startEditingMessage}
        toggleSelectedMessage={toggleSelectedMessage}
      />
      <FavoriteContextMenu
        contextMenu={favoriteContextMenu}
        copyFavoriteText={copyFavoriteText}
        pinnedFavoriteItem={pinnedFavoriteItem}
        removeFavoriteItem={removeFavoriteItem}
        replyToFavoriteItem={replyToFavoriteItem}
        selectedMessageIdSet={selectedMessageIdSet}
        setFavoriteContextMenu={setFavoriteContextMenu}
        startEditingFavoriteItem={startEditingFavoriteItem}
        togglePinnedFavoriteItem={togglePinnedFavoriteItem}
        toggleSelectedFavoriteItem={toggleSelectedFavoriteItem}
      />
      <UnpinAllDialog
        isOpen={isUnpinAllDialogOpen}
        messageCount={activePinnedMessages.length}
        onCancel={() => setIsUnpinAllDialogOpen(false)}
        onConfirm={unpinAllActivePinnedMessages}
      />
      <MessagePinDialog
        activePinnedMessageIdSet={activePinnedMessageIdSet}
        confirmPinnedMessage={confirmPinnedMessage}
        confirmUnpinPinnedMessage={confirmUnpinPinnedMessage}
        getReadableMessageText={getReadableMessageText}
        messagePinTarget={messagePinTarget}
        setMessagePinTarget={setMessagePinTarget}
        setShouldPinForBoth={setShouldPinForBoth}
        shouldPinForBoth={shouldPinForBoth}
      />
      <MessageDeleteDialog
        deleteMessage={deleteMessage}
        getReadableMessageText={getReadableMessageText}
        hideMessageForMe={hideMessageForMe}
        messageDeleteTarget={messageDeleteTarget}
        setMessageDeleteTarget={setMessageDeleteTarget}
      />
      <SelectedMessagesDeleteDialog
        deleteSelectedMessagesForBoth={deleteSelectedMessagesForBoth}
        getReadableMessageText={getReadableMessageText}
        hideSelectedMessagesForMe={hideSelectedMessagesForMe}
        isOpen={isSelectedDeleteDialogOpen}
        selectedDialogMessages={selectedDialogMessages}
        setIsSelectedDeleteDialogOpen={setIsSelectedDeleteDialogOpen}
      />
      <ChatDeleteDialog
        chatDeleteTargetProfile={chatDeleteTargetProfile}
        confirmDeleteChat={confirmDeleteChat}
        isDeletingChat={isDeletingChat}
        isOpen={isChatDeleteDialogOpen}
        onClose={() => {
          setIsChatDeleteDialogOpen(false);
          setChatDeleteTargetUserId(null);
        }}
      />
      <StickerPicker
        isOpen={isStickerPickerOpen}
        onClose={() => setIsStickerPickerOpen(false)}
        onSendSticker={sendSticker}
        position={stickerPickerPosition}
        stickers={stickerOptions}
      />
      <BlockConfirmationDialog
        confirmation={blockConfirmation}
        onCancel={() => setBlockConfirmation(null)}
        onConfirm={() => void confirmBlockChange()}
      />
      <ViewedProfileModal
        blockedByMeProfileIds={blockedByMeProfileIds}
        blockedProfileIds={blockedProfileIds}
        callStatus={callStatus}
        mutedProfiles={mutedProfiles}
        muteProfileNotifications={muteProfileNotifications}
        onClose={() => setViewedProfile(null)}
        openProfileAvatarGallery={openProfileAvatarGallery}
        profileNotificationMenuUserId={profileNotificationMenuUserId}
        requestBlockChange={requestBlockChange}
        setActiveView={setActiveView}
        setProfileNotificationMenuUserId={setProfileNotificationMenuUserId}
        setSelectedChatUserId={setSelectedChatUserId}
        startCall={startCall}
        unmuteProfileNotifications={unmuteProfileNotifications}
        user={user}
        viewedProfile={viewedProfile}
      />
    </>
  );
}

















