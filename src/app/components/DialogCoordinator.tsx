import { useApp } from "@/shared/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useSettings } from "@/features/settings/SettingsContext";
import { useProfiles } from "@/features/profile/ProfilesContext";
import { useChat } from "@/features/messages/contexts/ChatContext";
import { useCall } from "@/features/calls/CallContext";

// Components
import { AvatarGalleryOverlay } from "@/features/profile/components/AvatarGalleryOverlay";
import { AvatarDeleteDialog } from "@/features/profile/components/AvatarDeleteDialog";
import { ImagePreviewOverlay } from "@/components/media/ImagePreviewOverlay";
import { ChatContextMenu } from "@/features/messages/components/ChatContextMenu";
import { FolderContextMenu, FolderDeleteDialog, FolderDialog } from "@/features/messages/components/FolderMenus";
import { MessageContextMenu, FavoriteContextMenu } from "@/features/messages/components/MessageContextMenu";
import {
  UnpinAllDialog,
  MessagePinDialog,
  MessageDeleteDialog,
  SelectedMessagesDeleteDialog,
  ForwardMessagesDialog,
  ChatDeleteDialog,
} from "@/features/messages/components/MessageDialogs";
import { StickerPicker } from "@/features/messages/components/StickerPicker";
import { BlockConfirmationDialog } from "@/components/feedback/BlockConfirmationDialog";
import { ViewedProfileModal } from "@/features/profile/components/ViewedProfileModal";
import { stickerOptions } from "@/shared/constants";
import { useMemo } from "react";

export function DialogCoordinator() {
  const {
    setActiveView,
    setSelectedChatUserId,
    selectedImageUrl,
    setSelectedImageUrl,
    viewedProfile,
    setViewedProfile,
  } = useApp();

  const { user } = useAuth();

  const {
    mutedProfiles,
    localBlockedProfileIds,
  } = useSettings();

  const {
    profiles,
    profilesByUserId,
    avatarGalleryItems,
    avatarGalleryIndex,
    setAvatarGalleryIndex,
    canDeleteAvatarFromGallery,
    isAvatarDeleteDialogOpen,
    setIsAvatarDeleteDialogOpen,
    avatarGalleryUrl,
    deleteAvatarFromGallery,
    openProfileAvatarGallery,
  } = useProfiles();

  const {
    // Folders
    chatFolders,
    chatFolderAssignments,
    folderContextMenu,
    setFolderContextMenu,
    folderDeleteTarget,
    setFolderDeleteTarget,
    deleteChatFolder,
    folderDialog,
    setFolderDialog,
    folderNameDraft,
    setFolderNameDraft,
    submitFolderDialog,
    openCreateChatFolderDialog,
    updateChatFolderColor,
    openRenameFolderDialog,
    requestDeleteChatFolder,

    // Sync / block
    blockedByMeProfileIds,
    confirmBlockChange,
    requestBlockChange,
    blockConfirmation,
    setBlockConfirmation,

    // Context Menus
    chatContextMenu,
    setChatContextMenu,
    favoriteContextMenu,
    setFavoriteContextMenu,
    messageContextMenu,
    setMessageContextMenu,

    // Messages / Selection / Pins
    selectedMessageIdSet,
    activePinnedMessageIdSet,
    activePinnedMessages,
    isForwardDialogOpen,
    setIsForwardDialogOpen,
    isForwardingMessages,
    forwardMessagesToFavorites,
    forwardMessagesToProfile,
    selectedForwardMessages,
    isUnpinAllDialogOpen,
    setIsUnpinAllDialogOpen,
    unpinAllActivePinnedMessages,
    messagePinTarget,
    setMessagePinTarget,
    shouldPinForBoth,
    setShouldPinForBoth,
    confirmPinnedMessage,
    confirmUnpinPinnedMessage,
    requestPinnedMessage,
    requestUnpinPinnedMessage,

    // Deletes / Dialog targets
    isChatDeleteDialogOpen,
    setIsChatDeleteDialogOpen,
    chatDeleteTargetUserId,
    setChatDeleteTargetUserId,
    isDeletingChat,
    requestChatDeleteFromMenu,
    confirmChatDelete,
    messageDeleteTarget,
    setMessageDeleteTarget,
    deleteMessage,
    hideMessageForMe,
    isSelectedDeleteDialogOpen,
    setIsSelectedDeleteDialogOpen,
    selectedDialogMessages,
    deleteSelectedMessagesForBoth,
    hideSelectedMessagesForMe,

    // Favorites context menu
    pinnedFavoriteItem,
    copyMessageText,
    copyFavoriteText,
    removeFavoriteItem,
    replyToFavoriteItem,
    startEditingFavoriteItem,
    togglePinnedFavoriteItem,
    toggleSelectedFavoriteItem,
    replyToMessage,
    startEditingMessage,
    toggleSelectedMessage,
    requestMessageDelete,

    // Stickers
    isStickerPickerOpen,
    setIsStickerPickerOpen,
    sendSticker,
    stickerPickerPosition,
    archiveChatProfile,
    archivedChatProfileIds,
    pinnedChatProfileIds,
    toggleChatFolderFromMenu,
    togglePinnedChatProfile,
    unarchiveChatProfile,
    unmuteProfileNotifications,
    muteProfileNotifications,
    setProfileNotificationMenuUserId,
    profileNotificationMenuUserId,
  } = useChat();

  const {
    callStatus,
    startCall,
  } = useCall();

  const chatDeleteTargetProfile = useMemo(() => {
    const profile = chatDeleteTargetUserId ? profilesByUserId.get(chatDeleteTargetUserId) ?? null : null;
    if (!profile) return null;
    return {
      name: profile.display_name,
      username: profile.username ?? null,
      userId: profile.user_id,
    };
  }, [chatDeleteTargetUserId, profilesByUserId]);

  const blockedProfileIds = useMemo(() => Array.from(localBlockedProfileIds), [localBlockedProfileIds]);

  return (
    <>
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
        archiveChatProfile={archiveChatProfile}
        archivedProfileIds={archivedChatProfileIds}
        blockedByMeProfileIds={blockedByMeProfileIds}
        chatFolderAssignments={chatFolderAssignments}
        chatFolders={chatFolders}
        contextMenu={chatContextMenu}
        openCreateChatFolderDialog={openCreateChatFolderDialog}
        muteProfileNotifications={muteProfileNotifications}
        mutedProfiles={mutedProfiles}
        pinnedChatProfileIds={pinnedChatProfileIds}
        requestBlockChange={requestBlockChange}
        requestChatDeleteFromMenu={requestChatDeleteFromMenu}
        setChatContextMenu={setChatContextMenu}
        toggleChatFolderFromMenu={toggleChatFolderFromMenu}
        togglePinnedChatProfile={togglePinnedChatProfile}
        unarchiveChatProfile={unarchiveChatProfile}
        unmuteProfileNotifications={unmuteProfileNotifications}
      />
      <FolderContextMenu
        contextMenu={folderContextMenu}
        openRenameDialog={openRenameFolderDialog}
        requestDeleteFolder={requestDeleteChatFolder}
        setContextMenu={setFolderContextMenu}
        updateFolderColor={updateChatFolderColor}
      />
      <FolderDeleteDialog
        folder={folderDeleteTarget}
        onCancel={() => setFolderDeleteTarget(null)}
        onConfirm={() => {
          if (folderDeleteTarget) {
            void deleteChatFolder(folderDeleteTarget.id);
          }
        }}
      />
      <FolderDialog
        dialog={folderDialog}
        folderName={folderNameDraft}
        onClose={() => setFolderDialog(null)}
        onSubmit={submitFolderDialog}
        setFolderName={setFolderNameDraft}
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
        getReadableMessageText={(txt) => txt}
        messagePinTarget={messagePinTarget}
        setMessagePinTarget={setMessagePinTarget}
        setShouldPinForBoth={setShouldPinForBoth}
        shouldPinForBoth={shouldPinForBoth}
      />
      <MessageDeleteDialog
        deleteMessage={deleteMessage}
        getReadableMessageText={(txt) => txt}
        hideMessageForMe={hideMessageForMe}
        messageDeleteTarget={messageDeleteTarget}
        setMessageDeleteTarget={setMessageDeleteTarget}
      />
      <SelectedMessagesDeleteDialog
        deleteSelectedMessagesForBoth={deleteSelectedMessagesForBoth}
        getReadableMessageText={(txt) => txt}
        hideSelectedMessagesForMe={hideSelectedMessagesForMe}
        isOpen={isSelectedDeleteDialogOpen}
        selectedDialogMessages={selectedDialogMessages}
        setIsSelectedDeleteDialogOpen={setIsSelectedDeleteDialogOpen}
      />
      <ForwardMessagesDialog
        chatProfiles={profiles}
        isForwarding={isForwardingMessages}
        isOpen={isForwardDialogOpen}
        onClose={() => setIsForwardDialogOpen(false)}
        onForward={(profile) => void forwardMessagesToProfile(profile)}
        onForwardToFavorites={forwardMessagesToFavorites}
        profiles={profiles}
        selectedMessages={selectedForwardMessages}
        userId={user?.id}
      />
      <ChatDeleteDialog
        chatDeleteTargetProfile={chatDeleteTargetProfile}
        confirmDeleteChat={confirmChatDelete}
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
