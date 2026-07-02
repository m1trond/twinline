import { createContext, useContext, useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { Dispatch, SetStateAction, ReactNode, FormEvent, ChangeEvent, RefObject, MouseEvent, MutableRefObject } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApp } from "@/shared/context/AppContext";
import { useSettings } from "@/features/settings/SettingsContext";
import { useProfiles } from "@/features/profile/ProfilesContext";

// Hooks
import { useStoredMessageState } from "@/features/messages/hooks/useStoredMessageState";
import { useMessagesRealtimeState } from "@/features/messages/hooks/useMessagesRealtimeState";
import { useMessageStateRealtime } from "@/features/messages/hooks/useMessageStateRealtime";
import { useUserSyncState } from "@/features/sync/useUserSyncState";
import { useDirectMessageSender } from "@/features/messages/hooks/useDirectMessageSender";
import { useMessageAttachmentSender } from "@/features/messages/hooks/useMessageAttachmentSender";
import { useMessageStateActions } from "@/features/messages/hooks/useMessageStateActions";
import { useMessageDerivedState } from "@/features/messages/hooks/useMessageDerivedState";
import { useProfileBlockState } from "@/features/profile/useProfileBlockState";
import { useMessageContextMenus } from "@/features/messages/hooks/useMessageContextMenus";
import type { ChatContextMenuState, FavoriteContextMenuState, MessageContextMenuState } from "@/features/messages/hooks/useMessageContextMenus";
import { useForwardMessagesState } from "@/features/messages/hooks/useForwardMessagesState";
import { useMessagePinActions } from "@/features/messages/hooks/useMessagePinActions";
import { useMessageViewportEffects } from "@/features/messages/hooks/useMessageViewportEffects";
import { useMessageReceiptEffects } from "@/features/messages/hooks/useMessageReceiptEffects";
import { useMessageComposerState } from "@/features/messages/hooks/useMessageComposerState";

import type { UserSyncPayload } from "@/features/sync/queries";

// Contexts
import { useFolders } from "./FoldersContext";
import { useFavorites } from "./FavoritesContext";

// Types
import type {
  ActiveView,
  MessageRow,
  ProfileRow,
  FavoriteItem,
  ReplyMessagePayload,
  MessageTypingStateRow,
  MutedProfileUntil,
} from "@/shared/types";
import { supabase } from "@/lib/supabase";
import { messageColumns, stickerMessagePrefix, callMessagePrefix, archivedChatFolderId } from "@/shared/constants";
import {
  isCaptionEditableMessage,
  isDirectMessageForUser,
  isMessageBetweenUsers,
  isServiceMessage,
  mergeMessages,
  settleOptimisticMessage,
  updateEditableMessageText,
  createReplyMessageText,
  getReadableMessageText,
  getReceiptMessagePayload,
  getMessageAudioUrl,
  getMessageAttachmentCaption,
} from "@/shared/utils/messages";

export type BlockConfirmationState = {
  action: "block" | "unblock";
  targetLabel: string;
  userId: string;
} | null;

type MessagesContextType = {
  // Navigation & UI Refs
  messageInputRef: RefObject<HTMLInputElement | null>;
  messagesListRef: RefObject<HTMLDivElement | null>;
  messagesBottomAnchorRef: RefObject<HTMLDivElement | null>;
  scrollbarTrackRef: RefObject<HTMLDivElement | null>;
  scrollbarThumbRef: RefObject<HTMLDivElement | null>;
  scrollButtonRef: RefObject<HTMLButtonElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  stickerButtonRef: RefObject<HTMLButtonElement | null>;

  // Message / Composer State
  messageText: string;
  setMessageText: Dispatch<SetStateAction<string>>;
  chatSearchQuery: string;
  setChatSearchQuery: Dispatch<SetStateAction<string>>;
  isLoadingMessages: boolean;
  setIsLoadingMessages: Dispatch<SetStateAction<boolean>>;
  isUploadingAttachment: boolean;
  setIsUploadingAttachment: Dispatch<SetStateAction<boolean>>;
  isRecordingVoice: boolean;
  setIsRecordingVoice: Dispatch<SetStateAction<boolean>>;
  voiceRecordingDuration: number;
  setVoiceRecordingDuration: Dispatch<SetStateAction<number>>;
  voiceRecordingStartedAt: number | null;
  setVoiceRecordingStartedAt: Dispatch<SetStateAction<number | null>>;
  isStickerPickerOpen: boolean;
  setIsStickerPickerOpen: Dispatch<SetStateAction<boolean>>;
  stickerPickerPosition: { left: number; top: number };
  setStickerPickerPosition: Dispatch<SetStateAction<{ left: number; top: number }>>;
  toggleStickerPicker: () => void;

  // Realtime & Sync
  hasLoadedInitialMessages: boolean;
  messages: MessageRow[];
  setMessages: Dispatch<SetStateAction<MessageRow[]>>;
  sendDirectMessage: (
    text: string,
    options: {
      errorMessage: string;
      onError?: () => void;
      recipientId?: string | null;
    }
  ) => Promise<MessageRow | null>;
  sendAttachment: (file: File) => Promise<void>;
  sendVoiceMessage: (audioBlob: Blob) => Promise<void>;
  sendMessage: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleMessageTextChange: (event: ChangeEvent<HTMLInputElement>) => void;
  focusMessageInput: () => void;
  handleAttachmentChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleAttachmentDrop: (files: FileList | File[]) => Promise<void>;

  // Derived / Typing / Receipts
  isFriendTyping: boolean;
  messageReceiptStatuses: Map<number, "delivered" | "read">;
  playedVoiceMessageIds: Set<number>;
  totalUnreadMessageCount: number;
  messageTypingStates: MessageTypingStateRow[];
  sendTypingState: (action: "start" | "stop") => Promise<void>;
  markVoiceMessagePlayed: (message: MessageRow) => void;
  unreadMessagesByUserId: Map<string, number>;

  // Context Menus
  chatContextMenu: ChatContextMenuState | null;
  setChatContextMenu: Dispatch<SetStateAction<ChatContextMenuState | null>>;
  favoriteContextMenu: FavoriteContextMenuState | null;
  setFavoriteContextMenu: Dispatch<SetStateAction<FavoriteContextMenuState | null>>;
  messageContextMenu: MessageContextMenuState | null;
  setMessageContextMenu: Dispatch<SetStateAction<MessageContextMenuState | null>>;
  openChatContextMenu: (event: MouseEvent<HTMLElement>, profile: ProfileRow) => void;
  openFavoriteContextMenu: (event: MouseEvent<HTMLElement>, favoriteItem: FavoriteItem) => void;
  openMessageContextMenu: (event: MouseEvent<HTMLElement>, message: MessageRow) => void;

  // Selection & Forwarding
  selectedMessageIds: number[];
  setSelectedMessageIds: Dispatch<SetStateAction<number[]>>;
  selectedMessageIdSet: Set<number>;
  isMessageSelectionMode: boolean;
  handleMessageSelectionClick: (event: MouseEvent<HTMLElement>, message: MessageRow) => void;
  forwardSelectedMessages: () => void;
  isForwardDialogOpen: boolean;
  isForwardingMessages: boolean;
  setIsForwardDialogOpen: (open: boolean) => void;
  forwardMessagesToFavorites: () => Promise<void>;
  forwardMessagesToProfile: (profile: ProfileRow) => Promise<void>;
  selectedForwardMessages: MessageRow[];

  // Pinned Messages
  isPinnedMessagesViewOpen: boolean;
  setIsPinnedMessagesViewOpen: Dispatch<SetStateAction<boolean>>;
  activePinnedMessages: MessageRow[];
  activePinnedMessageIdSet: Set<number>;
  messagePinTarget: MessageRow | null;
  setMessagePinTarget: Dispatch<SetStateAction<MessageRow | null>>;
  shouldPinForBoth: boolean;
  setShouldPinForBoth: Dispatch<SetStateAction<boolean>>;
  confirmPinnedMessage: () => Promise<void>;
  confirmUnpinPinnedMessage: () => Promise<void>;
  requestPinnedMessage: (message: MessageRow) => void;
  requestUnpinPinnedMessage: (message: MessageRow) => void;
  unpinAllActivePinnedMessages: () => Promise<void>;
  removeLocalPinnedMessageId: (messageId: number, chatUserId: string | null) => void;
  scrollToNextPinnedMessage: () => void;

  // Dialogs
  isChatDeleteDialogOpen: boolean;
  setIsChatDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  chatDeleteTargetUserId: string | null;
  setChatDeleteTargetUserId: Dispatch<SetStateAction<string | null>>;
  isUnpinAllDialogOpen: boolean;
  setIsUnpinAllDialogOpen: Dispatch<SetStateAction<boolean>>;
  isDeletingChat: boolean;
  requestChatDeleteFromMenu: (profile: ProfileRow) => void;
  confirmChatDelete: () => Promise<void>;
  messageDeleteTarget: MessageRow | null;
  setMessageDeleteTarget: Dispatch<SetStateAction<MessageRow | null>>;
  isSelectedDeleteDialogOpen: boolean;
  setIsSelectedDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  selectedDialogMessages: MessageRow[];

  // Actions on Messages / Favorites
  copyMessageText: (message: MessageRow) => Promise<void>;
  copyFavoriteText: (item: FavoriteItem) => Promise<void>;
  replyToMessage: (message: MessageRow) => void;
  startEditingMessage: (message: MessageRow) => void;
  toggleSelectedMessage: (message: MessageRow) => void;
  hideSelectedMessagesForMe: () => void;
  deleteSelectedMessagesForBoth: () => Promise<void>;
  requestMessageDelete: (message: MessageRow) => void;
  deleteMessage: (message: MessageRow) => Promise<void>;
  hideMessageForMe: (message: MessageRow) => void;
  sendSticker: (sticker: string) => Promise<void>;

  // Notification States & Actions
  profileNotificationMenuUserId: string | null;
  setProfileNotificationMenuUserId: Dispatch<SetStateAction<string | null>>;
  muteProfileNotifications: (profileUserId: string, durationMs: number | null) => void;
  unmuteProfileNotifications: (profileUserId: string) => void;

  // Sync / Misc
  toggleStoredBooleanSetting: (storageKey: string, setter: (value: boolean) => void, currentValue: boolean) => void;
  saveUserSyncPatch: (patch: UserSyncPayload) => void;
  activeDialogMessages: MessageRow[];
  loadedDialogUserIds: Set<string>;
  friendProfile: ProfileRow | null;
  visibleChatProfiles: ProfileRow[];
  latestVisibleMessageByProfileId: Map<string, MessageRow>;
  highlightedMessageId: number | null;
  setHighlightedMessageId: Dispatch<SetStateAction<number | null>>;
  highlightMessage: (messageId: number) => boolean;
  replyTarget: MessageRow | null;
  setReplyTarget: Dispatch<SetStateAction<MessageRow | null>>;
  editingMessage: MessageRow | null;
  setEditingMessage: Dispatch<SetStateAction<MessageRow | null>>;
  scrollToReplyMessage: (reply: ReplyMessagePayload) => void;
  scrollToBottom: () => void;
  saveCallSummaryMessage: (partnerId: string, startedAt: number) => Promise<void>;

  errorMessage: string;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  getReadableMessageText: (text: string) => string;

  // Block states
  blockedByMeProfiles: Array<{
    avatarUrl: string | null;
    name: string;
    username: string | null;
    userId: string;
  }>;
  blockedByMeProfileIds: string[];
  blockedMeProfileIds: string[];
  blockedProfileIds: string[];
  blockedProfileIdsRef: MutableRefObject<Set<string>>;
  confirmBlockChange: () => Promise<void>;
  requestBlockChange: (userId: string, targetLabel: string) => void;
  blockConfirmation: BlockConfirmationState;
  setBlockConfirmation: Dispatch<SetStateAction<BlockConfirmationState>>;
  isSelectedChatBlocked: boolean;
  isSelectedChatBlockedByMe: boolean;
  isSelectedChatBlockingMe: boolean;

  selectedChatUserId: string | null;
  setSelectedChatUserId: (userId: string | null) => void;
  removeFavoriteItem: (favoriteItemId: number) => void;
  replyToFavoriteItem: (item: FavoriteItem) => void;
  startEditingFavoriteItem: (item: FavoriteItem) => void;
  togglePinnedFavoriteItem: (item: FavoriteItem) => void;
};

const MessagesContext = createContext<MessagesContextType | null>(null);

export function MessagesContextProvider({
  children,
  showToast,
  chatContextMenu,
  setChatContextMenu,
}: {
  children: ReactNode;
  showToast: (msg: ReactNode) => void;
  chatContextMenu: ChatContextMenuState | null;
  setChatContextMenu: Dispatch<SetStateAction<ChatContextMenuState | null>>;
}) {
  const { user } = useAuth();
  const {
    interfaceLanguage,
    setInterfaceLanguage,
    activeView,
    setActiveView,
    selectedChatUserId,
    setSelectedChatUserId,
    errorMessage,
    setErrorMessage,
    saveUserSyncPatch,
    saveUserSyncPatchRef,
  } = useApp();

  const {
    areNotificationsEnabled,
    areSoftEffectsEnabled,
    isLightThemeEnabled,
    isOnlineStatusVisible,
    isProfileSearchable,
    mutedProfiles,
    setAreSoftEffectsEnabled,
    setIsLightThemeEnabled,
    setIsOnlineStatusVisible,
    setIsProfileSearchable,
    localBlockedProfileIds,
    setLocalBlockedProfileIds,
    setMutedProfiles,
  } = useSettings();

  const { profiles, currentProfile, profilesByUserId, activeUserName } = useProfiles();

  // Child contexts
  const {
    chatFolders,
    chatFolderAssignments,
    allChatFolderName,
    pinnedChatProfileIds,
    archivedChatProfileIds,
    selectedChatFolderId,
  } = useFolders();
  const { favoriteItems, setPinnedFavoriteItem, saveFavoriteItems } = useFavorites();

  const activeViewRef = useRef<ActiveView>(activeView);
  const selectedChatUserIdRef = useRef<string | null>(selectedChatUserId);
  const notificationsEnabledRef = useRef(false);
  const mutedProfilesRef = useRef<MutedProfileUntil>({});
  const blockedProfileIdsRef = useRef<Set<string>>(new Set());
  const isDeletingChatRef = useRef(false);



  const [blockConfirmation, setBlockConfirmation] = useState<BlockConfirmationState>(null);
  const [profileNotificationMenuUserId, setProfileNotificationMenuUserId] = useState<string | null>(null);

  useEffect(() => {
    blockedProfileIdsRef.current = new Set(localBlockedProfileIds);
  }, [localBlockedProfileIds]);

  useEffect(() => { activeViewRef.current = activeView; }, [activeView]);
  useEffect(() => { selectedChatUserIdRef.current = selectedChatUserId; }, [selectedChatUserId]);
  useEffect(() => { notificationsEnabledRef.current = areNotificationsEnabled; }, [areNotificationsEnabled]);
  useEffect(() => {
    const nextMuted: MutedProfileUntil = {};
    for (const [id, value] of Object.entries(mutedProfiles)) {
      if (value !== undefined) {
        nextMuted[id] = value;
      }
    }
    mutedProfilesRef.current = nextMuted;
  }, [mutedProfiles]);

  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const messagesBottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const scrollbarTrackRef = useRef<HTMLDivElement | null>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement | null>(null);
  const scrollButtonRef = useRef<HTMLButtonElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const stickerButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isDeletingChat, setIsDeletingChat] = useState(false);

  const [favoriteContextMenu, setFavoriteContextMenu] = useState<FavoriteContextMenuState | null>(null);
  const [messageContextMenu, setMessageContextMenu] = useState<MessageContextMenuState | null>(null);
  const [isChatDeleteDialogOpen, setIsChatDeleteDialogOpen] = useState(false);
  const [chatDeleteTargetUserId, setChatDeleteTargetUserId] = useState<string | null>(null);
  const [isUnpinAllDialogOpen, setIsUnpinAllDialogOpen] = useState(false);
  const [messagePinTarget, setMessagePinTarget] = useState<MessageRow | null>(null);
  const [shouldPinForBoth, setShouldPinForBoth] = useState(true);
  const [isPinnedMessagesViewOpen, setIsPinnedMessagesViewOpen] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<number[]>([]);
  const [messageDeleteTarget, setMessageDeleteTarget] = useState<MessageRow | null>(null);
  const [isSelectedDeleteDialogOpen, setIsSelectedDeleteDialogOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageRow | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageRow | null>(null);

  const selectedMessageIdSet = useMemo(() => new Set(selectedMessageIds), [selectedMessageIds]);

  // Hook 3: Stored Message State (Hidden & Local Pins)
  const {
    hiddenMessageIds,
    hiddenMessageIdSet,
    pinnedMessageIdsByChat,
    setPinnedMessageIdsByChat,
    setHiddenMessageIds,
  } = useStoredMessageState(user?.id);

  // Hook 4: Message Composer State (Composer UI states)
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
    isStickerPickerOpen,
    setIsStickerPickerOpen,
    stickerPickerPosition,
    setStickerPickerPosition,
  } = useMessageComposerState();

  const toggleStickerPicker = useCallback(() => {
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

    setIsStickerPickerOpen((isOpen: boolean) => !isOpen);
  }, [setIsStickerPickerOpen, setStickerPickerPosition]);

  // Hook 5: Messages Realtime State (Messages loading & Supabase broadcast channel)
  const {
    messages,
    setMessages,
    hasLoadedInitialMessages,
    loadedDialogUserIds,
    broadcastMessage,
  } = useMessagesRealtimeState({
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
  });

  // Hook 6: Message State Realtime (Pins, Receipts & Typing over broadcast)
  const {
    messagePins,
    messageReceipts,
    messageTypingStates,
    setMessagePins,
    setMessageReceipts,
    broadcastPin,
    broadcastReceipt,
    broadcastReceipts,
    broadcastTypingState,
    hasLoadedMessageReceipts,
  } = useMessageStateRealtime(user);

  // Hook 7: User Sync State (Settings & preferences synced to user_sync_states)
  const {
    toggleStoredBooleanSetting,
    muteProfileNotifications,
    unmuteProfileNotifications,
    saveHiddenMessageIds,
    savePinnedMessageIdsByChat,
  } = useUserSyncState({
    allChatFolderName,
    applyChatFoldersSyncPayload: () => {}, // Handled by FoldersContext internally or synced in DB
    applyFavoritesSyncPayload: () => {}, // Handled by FavoritesContext internally
    archivedChatProfileIds,
    areSoftEffectsEnabled,
    avatarHistory: [],
    chatFolderAssignments,
    chatFolders,
    favoriteItems,
    hiddenMessageIds,
    interfaceLanguage,
    isLightThemeEnabled,
    isOnlineStatusVisible,
    isProfileSearchable,
    localBlockedProfileIds,
    mutedProfiles,
    pinnedChatProfileIds,
    pinnedMessageIdsByChat,
    readLocalChatFoldersSyncPayload: () => ({}),
    readLocalFavoritesSyncPayload: () => ({}),
    resetChatFoldersState: () => {},
    saveUserSyncPatchRef,
    setAreSoftEffectsEnabled,
    setAvatarHistory: () => {},
    setErrorMessage,
    setHiddenMessageIds,
    setInterfaceLanguage,
    setIsLightThemeEnabled,
    setIsOnlineStatusVisible,
    setIsProfileSearchable,
    setLocalBlockedProfileIds,
    setMutedProfiles,
    setPinnedMessageIdsByChat,
    setProfileNotificationMenuUserId,
    user,
  });

  // Hook 8: Direct Message Sender (Insert query to Supabase)
  const sendDirectMessage = useDirectMessageSender({
    activeUserName,
    broadcastMessage,
    selectedChatUserId,
    setErrorMessage,
    setMessages,
    user,
    messages,
  });

  // Hook 12: Profile Block State (Calculated directly inside MessagesContextProvider)
  const {
    blockedByMeProfileIds,
    blockedByMeProfiles,
    blockedMeProfileIds,
    blockedProfileIds,
    confirmBlockChange,
    requestBlockChange,
  } = useProfileBlockState({
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
    setIncomingCall: () => {},
    setLocalBlockedProfileIds,
    setMessageText,
    setMessages,
    setProfileNotificationMenuUserId,
    setReplyTarget,
    user,
  });

  const isSelectedChatBlockedByMe = useMemo(() => {
    return selectedChatUserId ? blockedByMeProfileIds.includes(selectedChatUserId) : false;
  }, [blockedByMeProfileIds, selectedChatUserId]);

  const isSelectedChatBlockingMe = useMemo(() => {
    return selectedChatUserId ? blockedMeProfileIds.includes(selectedChatUserId) : false;
  }, [blockedMeProfileIds, selectedChatUserId]);

  const isSelectedChatBlocked = isSelectedChatBlockedByMe || isSelectedChatBlockingMe;

  // Custom callback for adding messages to Favorites (defined inline)
  const addFavoriteChatMessage = useCallback(
    (messageOrText: MessageRow | string) => {
      const message: MessageRow = typeof messageOrText === "string"
        ? {
            id: -Date.now(),
            text: messageOrText,
            author: activeUserName,
            user_id: user?.id ?? "",
            created_at: new Date().toISOString(),
            recipient_id: null,
          }
        : messageOrText;
      const isVoice = message.text ? message.text.startsWith("[[voice:") : false;
      const favoriteItem: FavoriteItem = {
        author: message.author,
        client_key: `favorite-${Date.now()}-${crypto.randomUUID()}`,
        created_at: new Date().toISOString(),
        id: -Date.now(),
        text: message.text,
        user_id: user?.id ?? "",
        edited_at: isVoice ? null : message.edited_at ?? null,
        recipient_id: null,
        saved_at: new Date().toISOString(),
        original_created_at: message.created_at ?? new Date().toISOString(),
        original_message_id: message.id ?? -Date.now(),
        original_sender_id: message.user_id ?? user?.id ?? "",
      };

      saveFavoriteItems([favoriteItem, ...favoriteItems]);
      showToast(
        interfaceLanguage === "ru"
          ? "Сообщение сохранено в Избранное"
          : "Message saved to Favorites"
      );
    },
    [favoriteItems, saveFavoriteItems, showToast, user?.id, interfaceLanguage, activeUserName]
  );

  // Hook 9: Message Attachment Sender (Upload to bucket + insert message)
  const { sendAttachment, sendVoiceMessage } = useMessageAttachmentSender({
    activeView,
    addFavoriteChatMessage,
    selectedChatUserId,
    sendDirectMessage,
    setErrorMessage,
    setIsUploadingAttachment,
    userId: user?.id,
  });

  // Hook 11: Message Derived State (Friend profile, visible chats, unread count, played audio)
  const {
    isFriendTyping,
    messageReceiptStatuses,
    playedVoiceMessageIds,
    totalUnreadMessageCount,
    incomingUnreadMessageIds,
    sharedPinnedMessageIds,
    sharedPinnedMessageIdSet,
    sentReceiptMessageIdSets,
  } = useMessageDerivedState({
    hasLoadedMessageReceipts,
    hiddenMessageIdSet,
    messagePins,
    messageReceipts,
    messages,
    messageTypingStates,
    selectedChatUserId,
    userId: user?.id,
  });

  // Derived messages state
  const currentUserId = user?.id ?? null;

  const visibleMessages = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    return messages.filter((message) => {
      return (
        isDirectMessageForUser(message, currentUserId) &&
        !hiddenMessageIdSet.has(message.id) &&
        !isServiceMessage(message.text)
      );
    });
  }, [currentUserId, hiddenMessageIdSet, messages]);

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

  const selectedForwardMessages = selectedDialogMessages;

  // Viewport derived keys
  const activeDialogMessagesKey = useMemo(() => {
    return activeDialogMessages.map((m) => `${m.id}-${m.edited_at ?? ""}`).join(",");
  }, [activeDialogMessages]);

  const favoriteItemsKey = useMemo(() => {
    return favoriteItems.map((f) => `${f.id}-${f.edited_at ?? ""}`).join(",");
  }, [favoriteItems]);

  const favoriteItemsCount = favoriteItems.length;
  const lastOwnDialogMessageKey = useMemo(() => {
    if (!user) return "";
    const ownMsgs = activeDialogMessages.filter((m) => m.user_id === user.id);
    if (ownMsgs.length === 0) return "";
    const lastMsg = ownMsgs[ownMsgs.length - 1];
    return `${lastMsg.id}-${lastMsg.edited_at ?? ""}`;
  }, [activeDialogMessages, user]);

  // Inline derived states
  const friendProfile = useMemo(() => {
    return selectedChatUserId ? profilesByUserId.get(selectedChatUserId) ?? null : null;
  }, [profilesByUserId, selectedChatUserId]);

  const latestVisibleMessageByProfileId = useMemo(() => {
    const latestMap = new Map<string, MessageRow>();
    if (!user) return latestMap;

    for (const message of messages) {
      if (isServiceMessage(message.text)) continue;
      const otherUserId = message.user_id === user.id ? message.recipient_id : message.user_id;
      if (!otherUserId) continue;

      const currentLatest = latestMap.get(otherUserId);
      if (!currentLatest || new Date(message.created_at) > new Date(currentLatest.created_at)) {
        latestMap.set(otherUserId, message);
      }
    }

    return latestMap;
  }, [messages, user]);

  const visibleChatProfiles = useMemo(() => {
    const isArchived = (profileUserId: string) => archivedChatProfileIds.includes(profileUserId);
    const matchesQuery = (profile: ProfileRow) => {
      if (!chatSearchQuery.trim()) return true;
      const lowerQuery = chatSearchQuery.toLowerCase();
      return (
        profile.display_name.toLowerCase().includes(lowerQuery) ||
        (profile.username && profile.username.toLowerCase().includes(lowerQuery))
      );
    };

    const filteredProfiles =
      selectedChatFolderId === archivedChatFolderId
        ? profiles.filter((profile) => isArchived(profile.user_id) && matchesQuery(profile))
        : selectedChatFolderId === allChatFolderName || !selectedChatFolderId
          ? profiles.filter((profile) => !isArchived(profile.user_id) && matchesQuery(profile))
          : profiles.filter((profile) => {
              const assignedIds = chatFolderAssignments[selectedChatFolderId] ?? [];
              return assignedIds.includes(profile.user_id) && !isArchived(profile.user_id) && matchesQuery(profile);
            });

    const pinnedProfileIds = new Set(pinnedChatProfileIds);

    return [...filteredProfiles].sort((firstProfile, secondProfile) => {
      const firstPinned = pinnedProfileIds.has(firstProfile.user_id);
      const secondPinned = pinnedProfileIds.has(secondProfile.user_id);

      if (firstPinned !== secondPinned) {
        return firstPinned ? -1 : 1;
      }

      const firstLatest = latestVisibleMessageByProfileId.get(firstProfile.user_id);
      const secondLatest = latestVisibleMessageByProfileId.get(secondProfile.user_id);
      const firstTime = firstLatest ? new Date(firstLatest.created_at).getTime() : 0;
      const secondTime = secondLatest ? new Date(secondLatest.created_at).getTime() : 0;

      if (firstTime !== secondTime) {
        return secondTime - firstTime;
      }

      const nameCompare = firstProfile.display_name.localeCompare(secondProfile.display_name, undefined, {
        sensitivity: "base",
      });

      return nameCompare !== 0 ? nameCompare : firstProfile.user_id.localeCompare(secondProfile.user_id);
    });
  }, [
    allChatFolderName,
    archivedChatProfileIds,
    chatFolderAssignments,
    chatSearchQuery,
    latestVisibleMessageByProfileId,
    pinnedChatProfileIds,
    profiles,
    selectedChatFolderId,
  ]);

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



  const isMessageSelectionMode = selectedDialogMessages.length > 0;

  // Hook 13: Message Context Menus (ContextMenu placement handlers)
  const {
    openChatContextMenu,
    openFavoriteContextMenu,
    openMessageContextMenu,
    requestChatDeleteFromMenu,
  } = useMessageContextMenus({
    setChatContextMenu,
    setChatDeleteTargetUserId,
    setFavoriteContextMenu,
    setIsChatDeleteDialogOpen,
    setIsStickerPickerOpen,
    setMessageContextMenu,
    userId: user?.id,
  });

  // Hook 14: Forward Messages State (Copy selected messages to another user/favorites)
  const {
    isForwardDialogOpen,
    isForwardingMessages,
    setIsForwardDialogOpen,
    forwardSelectedMessages,
    forwardMessagesToFavorites,
    forwardMessagesToProfile,
  } = useForwardMessagesState({
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
  });

  const activeLocalPinnedMessageIds = useMemo(() => {
    const activeLocalPinnedMessageIds = selectedChatUserId
      ? pinnedMessageIdsByChat[selectedChatUserId] ?? []
      : [];
    return Array.from(new Set([
      ...activeLocalPinnedMessageIds,
      ...Array.from(sharedPinnedMessageIdSet),
    ]));
  }, [pinnedMessageIdsByChat, selectedChatUserId, sharedPinnedMessageIdSet]);

  const activePinnedMessageIdSet = useMemo(() => new Set(activeLocalPinnedMessageIds), [activeLocalPinnedMessageIds]);

  const activePinnedMessages = useMemo(() => {
    return activeDialogMessages.filter((message) => activePinnedMessageIdSet.has(message.id));
  }, [activeDialogMessages, activePinnedMessageIdSet]);

  // Direct send service messages
  const sendServiceMessage = useCallback(
    async (text: string, recipientId = selectedChatUserId) => {
      if (!user || !recipientId) return;

      const now = Date.now();
      const optimisticMessage: MessageRow = {
        author: activeUserName,
        client_key: `local-service-${now}-${crypto.randomUUID()}`,
        created_at: new Date(now).toISOString(),
        id: -now,
        recipient_id: recipientId,
        text,
        user_id: user.id,
      };

      setMessages((currentMessages) => mergeMessages(currentMessages, [optimisticMessage]));

      const { data, error } = await supabase.from("messages").insert({
        author: activeUserName,
        recipient_id: recipientId,
        text,
        user_id: user.id,
        created_at: optimisticMessage.created_at,
      }).select(messageColumns).single();

      if (error) {
        setMessages((currentMessages) =>
          currentMessages.filter((m) => m.id !== optimisticMessage.id)
        );
        return;
      }

      if (data) {
        setMessages((currentMessages) =>
          settleOptimisticMessage(currentMessages, optimisticMessage, data)
        );
        broadcastMessage(data);
      }
    },
    [activeUserName, broadcastMessage, selectedChatUserId, setMessages, user]
  );

  // Hook 10: Message State Actions (Send typing state & receipts)
  const { sendMessageReceipt, sendMessageReceipts, sendTypingState } = useMessageStateActions({
    broadcastReceipt,
    broadcastReceipts,
    broadcastTypingState,
    selectedChatUserId,
    sendLegacyServiceMessage: sendServiceMessage,
    setMessageReceipts,
    user,
  });

  const markVoiceMessagePlayed = useCallback(
    (message: MessageRow) => {
      if (!user) {
        return;
      }

      const receiptPayload = getReceiptMessagePayload(message.text);

      if (
        !receiptPayload ||
        receiptPayload.status !== "played" ||
        message.user_id !== user.id
      ) {
        return;
      }

      sendMessageReceipt(message, "played");
    },
    [sendMessageReceipt, user],
  );

  // Хук отправки статусов доставлено/прочитано
  const isActiveDialogReady = !selectedChatUserId || loadedDialogUserIds.has(selectedChatUserId);

  useMessageReceiptEffects({
    activeView,
    isDialogLoading: isLoadingMessages || !isActiveDialogReady,
    messagesListRef,
    selectedChatUserId,
    sendMessageReceipt,
    sendMessageReceipts,
    sentReceiptMessageIdSets,
    userId: user?.id,
    visibleMessages,
  });

  // Hook 15: Message Pin Actions
  const {
    confirmPinnedMessage,
    confirmUnpinPinnedMessage,
    removeLocalPinnedMessageId,
    requestPinnedMessage,
    requestUnpinPinnedMessage,
    unpinAllActivePinnedMessages,
  } = useMessagePinActions({
    activePinnedMessageIdSet,
    activePinnedMessages,
    broadcastPin,
    messagePinTarget,
    pinnedMessageIdsByChat,
    savePinnedMessageIdsByChat,
    selectedChatUserId,
    sendLegacyServiceMessage: sendServiceMessage,
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
  });

  const [pinnedNavigationIndex, setPinnedNavigationIndex] = useState(0);

  const highlightedMessageTimeoutRef = useRef<number | null>(null);
  const pendingHighlightFallbackTimeoutRef = useRef<number | null>(null);
  const pendingHighlightObserverRef = useRef<IntersectionObserver | null>(null);

  const triggerMessageHighlight = useCallback((messageId: number, targetMessage: HTMLElement) => {
    if (highlightedMessageTimeoutRef.current !== null) {
      window.clearTimeout(highlightedMessageTimeoutRef.current);
      highlightedMessageTimeoutRef.current = null;
    }
    if (pendingHighlightFallbackTimeoutRef.current !== null) {
      window.clearTimeout(pendingHighlightFallbackTimeoutRef.current);
      pendingHighlightFallbackTimeoutRef.current = null;
    }
    if (pendingHighlightObserverRef.current !== null) {
      pendingHighlightObserverRef.current.disconnect();
      pendingHighlightObserverRef.current = null;
    }

    setHighlightedMessageId(null);

    const messagesList = messagesListRef.current;
    if (!messagesList || typeof IntersectionObserver === "undefined") {
      setHighlightedMessageId(messageId);
      highlightedMessageTimeoutRef.current = window.setTimeout(() => {
        setHighlightedMessageId(null);
        highlightedMessageTimeoutRef.current = null;
      }, 1200);
      return;
    }

    let isFinished = false;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            isFinished = true;
            observer.disconnect();
            if (pendingHighlightObserverRef.current === observer) {
              pendingHighlightObserverRef.current = null;
            }
            if (pendingHighlightFallbackTimeoutRef.current !== null) {
              window.clearTimeout(pendingHighlightFallbackTimeoutRef.current);
              pendingHighlightFallbackTimeoutRef.current = null;
            }

            setHighlightedMessageId(messageId);
            highlightedMessageTimeoutRef.current = window.setTimeout(() => {
              setHighlightedMessageId(null);
              highlightedMessageTimeoutRef.current = null;
            }, 1200);
            break;
          }
        }
      },
      {
        root: messagesList,
        threshold: 0.1,
      }
    );

    pendingHighlightObserverRef.current = observer;
    observer.observe(targetMessage);

    pendingHighlightFallbackTimeoutRef.current = window.setTimeout(() => {
      if (!isFinished) {
        observer.disconnect();
        if (pendingHighlightObserverRef.current === observer) {
          pendingHighlightObserverRef.current = null;
        }
        setHighlightedMessageId(messageId);
        highlightedMessageTimeoutRef.current = window.setTimeout(() => {
          setHighlightedMessageId(null);
          highlightedMessageTimeoutRef.current = null;
        }, 1200);
      }
      pendingHighlightFallbackTimeoutRef.current = null;
    }, 1500);
  }, []);

  const highlightMessage = useCallback((messageId: number) => {
    const targetMessage = messagesListRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    );

    if (targetMessage) {
      targetMessage.scrollIntoView({ behavior: "smooth", block: "center" });
      triggerMessageHighlight(messageId, targetMessage);
      return true;
    }
    return false;
  }, [triggerMessageHighlight]);

  const scrollToBottom = useCallback(() => {
    const messagesList = messagesListRef.current;
    if (messagesList) {
      messagesList.scrollTop = messagesList.scrollHeight - messagesList.clientHeight;
    }
  }, []);

  const scrollToReplyMessage = useCallback((reply: ReplyMessagePayload) => {
    if (!reply.messageId) {
      setErrorMessage("К этому старому ответу нельзя перейти: он был создан до привязки сообщений.");
      return;
    }

    const targetMessage = messagesListRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${reply.messageId}"]`,
    );

    if (!targetMessage) {
      setErrorMessage("Исходное сообщение не найдено.");
      return;
    }

    targetMessage.scrollIntoView({ behavior: "smooth", block: "center" });
    triggerMessageHighlight(reply.messageId, targetMessage);
    setErrorMessage("");
  }, [triggerMessageHighlight, setErrorMessage]);

  const scrollToNextPinnedMessage = useCallback(() => {
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
  }, [activePinnedMessages, isPinnedMessagesViewOpen, pinnedNavigationIndex, highlightMessage]);



  // Hook 16: Message Viewport Effects
  useMessageViewportEffects({
    activeView,
    activeDialogMessagesKey,
    favoriteItemsCount,
    favoriteItemsKey,
    highlightedMessageTimeoutRef,
    isActiveDialogReady,
    lastOwnDialogMessageKey,
    messagesListRef,
    selectedChatUserId,
  });

  // Sync scroll buttons when pinning panel changes
  useEffect(() => {
    if (isPinnedMessagesViewOpen) {
      if (scrollButtonRef.current) {
        scrollButtonRef.current.classList.add("opacity-0", "pointer-events-none");
        scrollButtonRef.current.classList.remove("opacity-100");
      }
      if (scrollbarTrackRef.current) {
        scrollbarTrackRef.current.classList.add("opacity-0", "pointer-events-none");
        scrollbarTrackRef.current.classList.remove("opacity-100");
      }
    }
  }, [isPinnedMessagesViewOpen]);

  // Composer event handlers
  const handleMessageTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextMessageText = event.target.value;
      if (!user || editingMessage || activeView === "favorites") {
        return;
      }

      if (!nextMessageText.trim()) {
        typingSentAtRef.current = 0;
        void sendTypingState("stop");
        return;
      }

      const now = Date.now();
      if (now - typingSentAtRef.current < 4000) {
        return;
      }

      typingSentAtRef.current = now;
      void sendTypingState("start");
    },
    [user, editingMessage, activeView, sendTypingState]
  );

  const focusMessageInput = useCallback(() => {
    messageInputRef.current?.focus();
  }, []);

  const typingSentAtRef = useRef(0);

  const sendMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!user) {
        setErrorMessage("Сначала войди в аккаунт.");
        return;
      }

      const currentText = messageInputRef.current?.value ?? messageText;
      const trimmedText = currentText.trim();
      const isEditingCaptionMessage = Boolean(
        editingMessage && isCaptionEditableMessage(editingMessage.text)
      );

      if (!trimmedText && !isEditingCaptionMessage) return;

      if (activeView === "favorites") {
        if (editingMessage) {
          const editedText = updateEditableMessageText(editingMessage.text, trimmedText);
          const hasTextChanged = editedText !== editingMessage.text;
          const editedAt = new Date().toISOString();
          const updatedFavoriteItem: FavoriteItem = {
            ...(editingMessage as FavoriteItem),
            edited_at: hasTextChanged ? editedAt : editingMessage.edited_at ?? null,
            text: editedText,
          };

          saveFavoriteItems(
            favoriteItems.map((f) => (f.id === editingMessage.id ? updatedFavoriteItem : f))
          );
          setPinnedFavoriteItem((curr) => (curr?.id === editingMessage.id ? updatedFavoriteItem : curr));
          setEditingMessage(null);
          setMessageText("");
          if (messageInputRef.current) messageInputRef.current.value = "";
          setErrorMessage("");
        } else {
          addFavoriteChatMessage(
            replyTarget ? createReplyMessageText(replyTarget, trimmedText) : trimmedText
          );
          setMessageText("");
          if (messageInputRef.current) {
            messageInputRef.current.value = "";
          }
          setReplyTarget(null);
        }
        return;
      }

      if (!selectedChatUserId) return;

      if (editingMessage) {
        const messageId = editingMessage.id;
        const previousText = editingMessage.text;
        const nextText = isEditingCaptionMessage
          ? updateEditableMessageText(previousText, trimmedText)
          : trimmedText;

        if (nextText === previousText) {
          setEditingMessage(null);
          setMessageText("");
          if (messageInputRef.current) messageInputRef.current.value = "";
          return;
        }

        const editedAt = new Date().toISOString();
        setMessages((currentMessages) =>
          currentMessages.map((m) =>
            m.id === messageId ? { ...m, text: nextText, edited_at: editedAt } : m
          )
        );

        setEditingMessage(null);
        setMessageText("");
        if (messageInputRef.current) messageInputRef.current.value = "";

        const { error, data } = await supabase
          .from("messages")
          .update({ text: nextText, edited_at: editedAt })
          .eq("id", messageId)
          .select(messageColumns)
          .single();

        if (error) {
          setMessages((currentMessages) =>
            currentMessages.map((m) =>
              m.id === messageId ? { ...m, text: previousText, edited_at: m.edited_at } : m
            )
          );
          setErrorMessage("Не получилось отредактировать сообщение.");
          return;
        }

        if (data) {
          broadcastMessage(data);
        }
        setErrorMessage("");
        return;
      }

      const outgoingText = replyTarget
        ? createReplyMessageText(replyTarget, trimmedText)
        : trimmedText;

      const previousReplyTarget = replyTarget;
      setReplyTarget(null);
      setMessageText("");
      if (messageInputRef.current) {
        messageInputRef.current.value = "";
      }
      focusMessageInput();

      const sentMsg = await sendDirectMessage(outgoingText, {
        errorMessage: "Не получилось отправить сообщение.",
        onError: () => {
          setMessageText(trimmedText);
          if (messageInputRef.current) {
            messageInputRef.current.value = trimmedText;
          }
          setReplyTarget(previousReplyTarget);
        },
      });

      if (sentMsg) {
        scrollToBottom();
      }
    },
    [
      activeView,
      addFavoriteChatMessage,
      editingMessage,
      favoriteItems,
      focusMessageInput,
      messageText,
      replyTarget,
      broadcastMessage,
      saveFavoriteItems,
      sendDirectMessage,
      setEditingMessage,
      setErrorMessage,
      setMessageText,
      setMessages,
      setPinnedFavoriteItem,
      setReplyTarget,
      selectedChatUserId,
      user,
      scrollToBottom,
    ]
  );

  const handleAttachmentChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    for (const file of files) {
      await sendAttachment(file);
    }
    event.target.value = "";
  }, [sendAttachment]);

  const handleAttachmentDrop = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      await sendAttachment(file);
    }
  }, [sendAttachment]);

  const copyMessageText = useCallback(async (message: MessageRow) => {
    try {
      const textToCopy = getReadableMessageText(message.text);
      await navigator.clipboard.writeText(textToCopy);
      showToast(
        interfaceLanguage === "ru"
          ? "Сообщение скопировано"
          : "Message copied"
      );
    } catch {
      setErrorMessage("Не удалось скопировать сообщение.");
    }
  }, [interfaceLanguage, showToast, setErrorMessage]);

  const copyFavoriteText = useCallback(async (item: FavoriteItem) => {
    try {
      const textToCopy = getReadableMessageText(item.text);
      await navigator.clipboard.writeText(textToCopy);
      showToast(
        interfaceLanguage === "ru"
          ? "Сообщение скопировано"
          : "Message copied"
      );
    } catch {
      setErrorMessage("Не удалось скопировать сообщение.");
    }
  }, [interfaceLanguage, showToast, setErrorMessage]);

  const replyToMessage = useCallback((message: MessageRow) => {
    setReplyTarget(message);
    setEditingMessage(null);
    setMessageText("");
    focusMessageInput();
  }, [focusMessageInput, setMessageText]);

  const startEditingMessage = useCallback((message: MessageRow) => {
    setEditingMessage(message);
    setReplyTarget(null);
    const plainText = getReadableMessageText(message.text);
    setMessageText(plainText);
    if (messageInputRef.current) {
      messageInputRef.current.value = plainText;
    }
    focusMessageInput();
  }, [focusMessageInput, setMessageText]);

  const toggleSelectedMessage = useCallback((message: MessageRow) => {
    setSelectedMessageIds((currentIds) =>
      currentIds.includes(message.id) ? currentIds.filter((id) => id !== message.id) : [...currentIds, message.id]
    );
    setMessageContextMenu(null);
    setErrorMessage("");
  }, [setErrorMessage]);

  const handleMessageSelectionClick = useCallback((
    event: MouseEvent<HTMLElement>,
    message: MessageRow,
  ) => {
    if (!isMessageSelectionMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleSelectedMessage(message);
  }, [isMessageSelectionMode, toggleSelectedMessage]);

  const hideSelectedMessagesForMe = useCallback(() => {
    if (selectedDialogMessages.length === 0) {
      return;
    }

    const nextHiddenMessageIds = [
      ...hiddenMessageIds,
      ...selectedDialogMessages.map((message) => message.id),
    ];

    saveHiddenMessageIds(nextHiddenMessageIds);
    setSelectedMessageIds([]);
    setMessageContextMenu(null);
    setErrorMessage("");

    for (const msg of selectedDialogMessages) {
      removeLocalPinnedMessageId(msg.id, msg.user_id === user?.id ? selectedChatUserId : msg.user_id);
    }
  }, [
    selectedDialogMessages,
    hiddenMessageIds,
    saveHiddenMessageIds,
    removeLocalPinnedMessageId,
    setErrorMessage,
    user?.id,
    selectedChatUserId,
  ]);

  const deleteSelectedMessagesForBoth = useCallback(async () => {
    if (selectedDialogMessages.length === 0) {
      return;
    }

    const messageIds = selectedDialogMessages.map((message) => message.id);
    setMessages((currentMessages) => currentMessages.filter((m) => !messageIds.includes(m.id)));
    setSelectedMessageIds([]);
    setMessageContextMenu(null);
    setErrorMessage("");

    for (const msg of selectedDialogMessages) {
      removeLocalPinnedMessageId(msg.id, msg.user_id === user?.id ? selectedChatUserId : msg.user_id);
    }

    const { error } = await supabase.from("messages").delete().in("id", messageIds);

    if (error) {
      setErrorMessage("Не получилось удалить сообщения.");
      return;
    }

    for (const msg of selectedDialogMessages) {
      broadcastMessage({
        ...msg,
        text: "", // service representation for delete
      });
    }
  }, [selectedDialogMessages, broadcastMessage, removeLocalPinnedMessageId, user?.id, selectedChatUserId, setMessages, setErrorMessage]);

  const requestMessageDelete = useCallback((message: MessageRow) => {
    setMessageDeleteTarget(message);
    setIsSelectedDeleteDialogOpen(false);
  }, []);

  const deleteMessage = useCallback(async (message: MessageRow) => {
    const messageId = message.id;
    setMessages((currentMessages) => currentMessages.filter((m) => m.id !== messageId));
    setMessageDeleteTarget(null);
    setErrorMessage("");
    removeLocalPinnedMessageId(message.id, message.user_id === user?.id ? selectedChatUserId : message.user_id);
    setSelectedMessageIds((curr) => curr.filter((id) => id !== message.id));

    const { error } = await supabase.from("messages").delete().eq("id", messageId);

    if (error) {
      setErrorMessage("Не получилось удалить сообщение.");
      return;
    }

    broadcastMessage({
      ...message,
      text: "",
    });
  }, [broadcastMessage, removeLocalPinnedMessageId, user?.id, selectedChatUserId, setMessages, setErrorMessage]);

  const hideMessageForMe = useCallback((message: MessageRow) => {
    if (!user) return;
    saveHiddenMessageIds([...hiddenMessageIds, message.id]);
    setMessageDeleteTarget(null);
    removeLocalPinnedMessageId(message.id, message.user_id === user.id ? selectedChatUserId : message.user_id);
    setSelectedMessageIds((curr) => curr.filter((id) => id !== message.id));
    setErrorMessage("");
  }, [user, hiddenMessageIds, selectedChatUserId, saveHiddenMessageIds, removeLocalPinnedMessageId, setErrorMessage]);

  const sendSticker = useCallback(async (sticker: string) => {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const stickerText = `${stickerMessagePrefix}${sticker}`;
    if (activeView === "favorites") {
      addFavoriteChatMessage(stickerText);
      setIsStickerPickerOpen(false);
      return;
    }

    if (!selectedChatUserId) {
      setErrorMessage("Сначала выбери собеседника.");
      setIsStickerPickerOpen(false);
      return;
    }

    focusMessageInput();
    setIsStickerPickerOpen(false);

    const sentMsg = await sendDirectMessage(stickerText, {
      errorMessage: "Не получилось отправить стикер.",
    });

    if (sentMsg) {
      scrollToBottom();
    }
  }, [activeView, addFavoriteChatMessage, focusMessageInput, sendDirectMessage, selectedChatUserId, user, scrollToBottom, setIsStickerPickerOpen, setErrorMessage]);

  const saveCallSummaryMessage = useCallback(
    async (partnerId: string, startedAt: number) => {
      if (!user) return;

      const durationMs = Date.now() - startedAt;
      const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
      const summaryText = `${callMessagePrefix}${durationSeconds}`;

      await supabase.from("messages").insert({
        author: activeUserName,
        recipient_id: partnerId,
        text: summaryText,
        user_id: user.id,
        created_at: new Date(startedAt).toISOString(),
      });
    },
    [activeUserName, user]
  );

  const confirmChatDelete = useCallback(async () => {
    if (!user || !chatDeleteTargetUserId) {
      return;
    }

    const targetUserId = chatDeleteTargetUserId;
    isDeletingChatRef.current = true;
    setIsDeletingChat(true);
    setIsChatDeleteDialogOpen(false);

    setMessages((currentMessages) =>
      currentMessages.filter((message) => !isMessageBetweenUsers(message, user.id, targetUserId))
    );

    const { error } = await supabase
      .from("messages")
      .delete()
      .or(
        `and(user_id.eq.${user.id},recipient_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},recipient_id.eq.${user.id})`
      );

    isDeletingChatRef.current = false;
    setIsDeletingChat(false);
    setChatDeleteTargetUserId(null);

    if (error) {
      setErrorMessage("Не получилось удалить переписку.");
      return;
    }

    if (selectedChatUserId === targetUserId) {
      setSelectedChatUserId(null);
    }

    setErrorMessage("");

    broadcastMessage({
      author: "",
      created_at: new Date().toISOString(),
      id: 0,
      recipient_id: user.id,
      text: "",
      user_id: targetUserId,
    });
  }, [
    chatDeleteTargetUserId,
    selectedChatUserId,
    user,
    broadcastMessage,
    setErrorMessage,
    setMessages,
    setSelectedChatUserId,
  ]);

  const removeFavoriteItem = useCallback((favoriteItemId: number) => {
    saveFavoriteItems(favoriteItems.filter((f) => f.id !== favoriteItemId));
    setPinnedFavoriteItem((curr) => (curr?.id === favoriteItemId ? null : curr));
    setSelectedMessageIds((currentIds) => currentIds.filter((id) => id !== favoriteItemId));
    setFavoriteContextMenu(null);
    setErrorMessage("");
  }, [favoriteItems, saveFavoriteItems, setPinnedFavoriteItem, setSelectedMessageIds, setFavoriteContextMenu, setErrorMessage]);

  const replyToFavoriteItem = useCallback((item: FavoriteItem) => {
    setReplyTarget(item);
    setEditingMessage(null);
    setMessageText("");
    if (messageInputRef.current) messageInputRef.current.value = "";
    setFavoriteContextMenu(null);
    setErrorMessage("");
    focusMessageInput();
  }, [focusMessageInput, setEditingMessage, setMessageText, setReplyTarget, setFavoriteContextMenu, setErrorMessage]);

  const startEditingFavoriteItem = useCallback((item: FavoriteItem) => {
    if (getMessageAudioUrl(item.text)) {
      setFavoriteContextMenu(null);
      setErrorMessage("Голосовые сообщения редактировать нельзя.");
      return;
    }
    const isCaptionEdit = isCaptionEditableMessage(item.text);
    const editText = isCaptionEdit
      ? getMessageAttachmentCaption(item.text) ?? ""
      : getReadableMessageText(item.text);

    setEditingMessage(item);
    setReplyTarget(null);
    setMessageText(editText);
    if (messageInputRef.current) messageInputRef.current.value = editText;
    setFavoriteContextMenu(null);
    setErrorMessage("");
    focusMessageInput();
  }, [focusMessageInput, setEditingMessage, setMessageText, setReplyTarget, setErrorMessage, setFavoriteContextMenu]);

  const togglePinnedFavoriteItem = useCallback((item: FavoriteItem) => {
    setPinnedFavoriteItem((curr) => (curr?.id === item.id ? null : item));
    setFavoriteContextMenu(null);
    setErrorMessage("");
  }, [setPinnedFavoriteItem, setFavoriteContextMenu, setErrorMessage]);

  const value = useMemo(() => ({
    messageInputRef,
    messagesListRef,
    messagesBottomAnchorRef,
    scrollbarTrackRef,
    scrollbarThumbRef,
    scrollButtonRef,
    imageInputRef,
    stickerButtonRef,
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
    isStickerPickerOpen,
    setIsStickerPickerOpen,
    stickerPickerPosition,
    setStickerPickerPosition,
    toggleStickerPicker,
    hasLoadedInitialMessages,
    messages,
    setMessages,
    sendDirectMessage,
    sendAttachment,
    sendVoiceMessage,
    sendMessage,
    handleMessageTextChange,
    focusMessageInput,
    handleAttachmentChange,
    handleAttachmentDrop,
    isFriendTyping,
    messageReceiptStatuses,
    playedVoiceMessageIds,
    totalUnreadMessageCount,
    messageTypingStates,
    sendTypingState,
    markVoiceMessagePlayed,
    unreadMessagesByUserId,
    chatContextMenu,
    setChatContextMenu,
    favoriteContextMenu,
    setFavoriteContextMenu,
    messageContextMenu,
    setMessageContextMenu,
    openChatContextMenu,
    openFavoriteContextMenu,
    openMessageContextMenu,
    selectedMessageIds,
    setSelectedMessageIds,
    selectedMessageIdSet,
    isMessageSelectionMode,
    handleMessageSelectionClick,
    forwardSelectedMessages,
    isForwardDialogOpen,
    isForwardingMessages,
    setIsForwardDialogOpen,
    forwardMessagesToFavorites,
    forwardMessagesToProfile,
    selectedForwardMessages,
    isPinnedMessagesViewOpen,
    setIsPinnedMessagesViewOpen,
    activePinnedMessages,
    activePinnedMessageIdSet,
    messagePinTarget,
    setMessagePinTarget,
    shouldPinForBoth,
    setShouldPinForBoth,
    confirmPinnedMessage,
    confirmUnpinPinnedMessage,
    requestPinnedMessage,
    requestUnpinPinnedMessage,
    unpinAllActivePinnedMessages,
    removeLocalPinnedMessageId,
    scrollToNextPinnedMessage,
    isChatDeleteDialogOpen,
    setIsChatDeleteDialogOpen,
    chatDeleteTargetUserId,
    setChatDeleteTargetUserId,
    isUnpinAllDialogOpen,
    setIsUnpinAllDialogOpen,
    isDeletingChat,
    requestChatDeleteFromMenu,
    confirmChatDelete,
    messageDeleteTarget,
    setMessageDeleteTarget,
    isSelectedDeleteDialogOpen,
    setIsSelectedDeleteDialogOpen,
    selectedDialogMessages,
    copyMessageText,
    copyFavoriteText,
    replyToMessage,
    startEditingMessage,
    toggleSelectedMessage,
    hideSelectedMessagesForMe,
    deleteSelectedMessagesForBoth,
    requestMessageDelete,
    deleteMessage,
    hideMessageForMe,
    sendSticker,
    profileNotificationMenuUserId,
    setProfileNotificationMenuUserId,
    muteProfileNotifications,
    unmuteProfileNotifications,
    toggleStoredBooleanSetting,
    saveUserSyncPatch,
    activeDialogMessages,
    loadedDialogUserIds,
    friendProfile,
    visibleChatProfiles,
    latestVisibleMessageByProfileId,
    highlightedMessageId,
    setHighlightedMessageId,
    highlightMessage,
    replyTarget,
    setReplyTarget,
    editingMessage,
    setEditingMessage,
    scrollToReplyMessage,
    scrollToBottom,
    saveCallSummaryMessage,
    errorMessage,
    setErrorMessage,
    getReadableMessageText,
    blockedByMeProfiles,
    blockedByMeProfileIds,
    blockedMeProfileIds,
    blockedProfileIds,
    blockedProfileIdsRef,
    confirmBlockChange,
    requestBlockChange,
    blockConfirmation,
    setBlockConfirmation,
    isSelectedChatBlocked,
    isSelectedChatBlockedByMe,
    isSelectedChatBlockingMe,
    selectedChatUserId,
    setSelectedChatUserId,
    removeFavoriteItem,
    replyToFavoriteItem,
    startEditingFavoriteItem,
    togglePinnedFavoriteItem,
  }), [
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
    isStickerPickerOpen,
    setIsStickerPickerOpen,
    stickerPickerPosition,
    setStickerPickerPosition,
    toggleStickerPicker,
    hasLoadedInitialMessages,
    messages,
    setMessages,
    sendDirectMessage,
    sendAttachment,
    sendVoiceMessage,
    sendMessage,
    handleMessageTextChange,
    focusMessageInput,
    handleAttachmentChange,
    handleAttachmentDrop,
    isFriendTyping,
    messageReceiptStatuses,
    playedVoiceMessageIds,
    totalUnreadMessageCount,
    messageTypingStates,
    sendTypingState,
    markVoiceMessagePlayed,
    unreadMessagesByUserId,
    chatContextMenu,
    setChatContextMenu,
    favoriteContextMenu,
    setFavoriteContextMenu,
    messageContextMenu,
    setMessageContextMenu,
    openChatContextMenu,
    openFavoriteContextMenu,
    openMessageContextMenu,
    selectedMessageIds,
    selectedMessageIdSet,
    isMessageSelectionMode,
    handleMessageSelectionClick,
    forwardSelectedMessages,
    isForwardDialogOpen,
    isForwardingMessages,
    setIsForwardDialogOpen,
    forwardMessagesToFavorites,
    forwardMessagesToProfile,
    selectedForwardMessages,
    isPinnedMessagesViewOpen,
    setIsPinnedMessagesViewOpen,
    activePinnedMessages,
    activePinnedMessageIdSet,
    messagePinTarget,
    setMessagePinTarget,
    shouldPinForBoth,
    setShouldPinForBoth,
    confirmPinnedMessage,
    confirmUnpinPinnedMessage,
    requestPinnedMessage,
    requestUnpinPinnedMessage,
    unpinAllActivePinnedMessages,
    removeLocalPinnedMessageId,
    scrollToNextPinnedMessage,
    isChatDeleteDialogOpen,
    setIsChatDeleteDialogOpen,
    chatDeleteTargetUserId,
    setChatDeleteTargetUserId,
    isUnpinAllDialogOpen,
    setIsUnpinAllDialogOpen,
    isDeletingChat,
    requestChatDeleteFromMenu,
    confirmChatDelete,
    messageDeleteTarget,
    setMessageDeleteTarget,
    isSelectedDeleteDialogOpen,
    setIsSelectedDeleteDialogOpen,
    selectedDialogMessages,
    copyMessageText,
    copyFavoriteText,
    replyToMessage,
    startEditingMessage,
    toggleSelectedMessage,
    hideSelectedMessagesForMe,
    deleteSelectedMessagesForBoth,
    requestMessageDelete,
    deleteMessage,
    hideMessageForMe,
    sendSticker,
    profileNotificationMenuUserId,
    setProfileNotificationMenuUserId,
    muteProfileNotifications,
    unmuteProfileNotifications,
    toggleStoredBooleanSetting,
    saveUserSyncPatch,
    activeDialogMessages,
    loadedDialogUserIds,
    friendProfile,
    visibleChatProfiles,
    latestVisibleMessageByProfileId,
    highlightedMessageId,
    setHighlightedMessageId,
    highlightMessage,
    replyTarget,
    setReplyTarget,
    editingMessage,
    setEditingMessage,
    scrollToReplyMessage,
    scrollToBottom,
    saveCallSummaryMessage,
    errorMessage,
    setErrorMessage,
    blockedByMeProfiles,
    blockedByMeProfileIds,
    blockedMeProfileIds,
    blockedProfileIds,
    confirmBlockChange,
    requestBlockChange,
    blockConfirmation,
    setBlockConfirmation,
    isSelectedChatBlocked,
    isSelectedChatBlockedByMe,
    isSelectedChatBlockingMe,
    selectedChatUserId,
    setSelectedChatUserId,
    removeFavoriteItem,
    replyToFavoriteItem,
    startEditingFavoriteItem,
    togglePinnedFavoriteItem,
  ]);

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessagesContextProvider");
  }
  return context;
}
