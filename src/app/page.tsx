"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { AppContextProvider, useApp } from "@/shared/context/AppContext";
import { AuthContextProvider, useAuth } from "@/features/auth/AuthContext";
import { SettingsContextProvider, useSettings } from "@/features/settings/SettingsContext";
import { ProfilesContextProvider, useProfiles } from "@/features/profile/ProfilesContext";
import { ChatContextProvider, useChat } from "@/features/messages/contexts/ChatContext";
import { CallContextProvider } from "@/features/calls/CallContext";

// Components
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { AppShell } from "@/components/layout/AppShell";
import { ChatListView } from "@/features/messages/components/ChatListView";
import { OpenChatView } from "@/features/messages/components/OpenChatView";
import { FavoritesView } from "@/features/messages/components/FavoritesView";
import { ProfileView } from "@/features/profile/components/ProfileView";
import { SettingsView } from "@/features/settings/components/SettingsView";
import { MusicView } from "@/features/music/components/MusicView";
import { AccessView } from "@/features/access/components/AccessView";
import { useAccessAdminState } from "@/features/access/useAccessAdminState";
import { DialogCoordinator } from "@/app/components/DialogCoordinator";
import { Toast } from "@/components/ui/Toast";

// Utils / Config
import { translations } from "@/shared/i18n";
import { useVoiceRecording } from "@/features/messages/hooks/useVoiceRecording";
import { useAuthSubmit } from "@/features/auth/hooks/useAuthSubmit";
import { useSearchableProfiles } from "@/features/messages/hooks/useSearchableProfiles";

function MainContent() {
  const {
    user,
    isAuthLoading,
    isSigningOut,
    handleSignOut,
    authEmail,
    authMode,
    authPassword,
    authUsername,
    setAuthEmail,
    setAuthMode,
    setAuthPassword,
    setAuthUsername,
    authUsernameError,
    setAuthUsernameError,
  } = useAuth();
  const { activeView, selectedChatUserId, setSelectedChatUserId, setViewedProfile, setSelectedImageUrl, interfaceLanguage, setActiveView } = useApp();
  const {
    chatFolders,
    visibleChatProfiles,
    hasLoadedInitialMessages,
    latestVisibleMessageByProfileId,
    messageReceiptStatuses,
    openFolderContextMenu,
    openChatContextMenu,
    openCreateEmptyChatFolderDialog,
    pinnedChatProfileIds,
    reorderChatFolders,
    selectedChatFolderId,
    setSelectedChatFolderId,
    unreadMessagesByUserId,
    isRecordingVoice,
    voiceRecordingDuration,
    setErrorMessage,
    errorMessage,
    // Favorites selection
    favoriteItems,
    forwardSelectedMessages,
    friendProfile,
    getReadableMessageText,
    handleAttachmentChange,
    handleAttachmentDrop,
    handleFavoriteSelectionClick,
    handleMessageTextChange,
    imageInputRef,
    isFavoriteSelectionMode,
    isPinnedMessagesViewOpen,
    isUploadingAttachment,
    messageInputRef,
    messageText,
    openFavoriteContextMenu,
    pinnedFavoriteItem,
    replyTarget,
    requestBlockChange,
    removeSelectedFavoriteItems,
    selectedFavoriteItems,
    selectedMessageIdSet,
    sendMessage,
    setEditingMessage,
    editingMessage,
    setMessageText,
    setPinnedFavoriteItem,
    setReplyTarget,
    stickerButtonRef,
    toggleStickerPicker,
    // Block lists
    blockedByMeProfiles,
    isSelectedChatBlocked,
    isSelectedChatBlockedByMe,
    totalUnreadMessageCount,
    toggleStoredBooleanSetting,
    chatSearchQuery,
    setChatSearchQuery,
  } = useChat();

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
  } = useSettings();

  const {
    profilesByUserId,
    currentProfile,
    activeUserName,
    profileName,
    setProfileName,
    setProfileBio,
    setProfileUsername,
    profileUsernameError,
    setProfileUsernameError,
    updateProfileBio,
    updateProfileName,
    updateProfileUsername,
    isSavingProfileBio,
    profileBioInputValue,
    profileNameInputValue,
    profileUsernameInputValue,
    profileBioSaveError,
    isUsernameChangeAllowed,
    nextUsernameChangeDate,
    avatarInputRef,
    handleAvatarChange,
    isEmailVerificationModalOpen,
    isEmailVerifiedInHush,
    isProfileBioChanged,
    isSendingEmailVerification,
    isUploadingAvatar,
    openAvatarGallery,
    sendEmailVerificationLetter,
    setIsEmailVerificationModalOpen,
  } = useProfiles();

  const { handleToggleVoiceRecording, handleCancelVoiceRecording } = useVoiceRecording();
  const { handleAuth } = useAuthSubmit();
  const searchableProfiles = useSearchableProfiles();
  const { toggleNotifications } = useSettings();
  const { canViewAccess } = useAccessAdminState(user);

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <AuthScreen
        authEmail={authEmail}
        authMode={authMode}
        authPassword={authPassword}
        authUsername={authUsername}
        authUsernameError={authUsernameError}
        errorMessage={errorMessage}
        isLightThemeEnabled={isLightThemeEnabled}
        onSubmit={handleAuth}
        setAuthEmail={setAuthEmail}
        setAuthMode={setAuthMode}
        setAuthPassword={setAuthPassword}
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
        canViewAccess={canViewAccess}
        chatSearchQuery={chatSearchQuery}
        areSoftEffectsEnabled={areSoftEffectsEnabled}
        isLightThemeEnabled={isLightThemeEnabled}
        searchableProfiles={searchableProfiles}
        setActiveView={setActiveView}
        setChatSearchQuery={setChatSearchQuery}
        setSelectedChatUserId={setSelectedChatUserId}
        setViewedProfile={setViewedProfile}
        totalUnreadMessageCount={totalUnreadMessageCount}
      >
        {activeView === "profile" ? (
          <ProfileView
            activeUserName={activeUserName}
            avatarInputRef={avatarInputRef}
            currentProfile={currentProfile}
            handleAvatarChange={handleAvatarChange}
            isSavingProfileBio={isSavingProfileBio}
            isUsernameChangeAllowed={isUsernameChangeAllowed}
            nextUsernameChangeDate={nextUsernameChangeDate}
            profileBioInputValue={profileBioInputValue}
            profileBioSaveError={profileBioSaveError}
            profileNameInputValue={profileNameInputValue}
            profileUsernameError={profileUsernameError}
            profileUsernameInputValue={profileUsernameInputValue}
            setProfileName={setProfileName}
            setProfileUsername={setProfileUsername}
            setProfileUsernameError={setProfileUsernameError}
            updateProfileBio={updateProfileBio}
            updateProfileName={updateProfileName}
            updateProfileUsername={updateProfileUsername}
            user={user}
            isEmailVerificationModalOpen={isEmailVerificationModalOpen}
            isEmailVerifiedInHush={isEmailVerifiedInHush}
            isProfileBioChanged={isProfileBioChanged}
            isSendingEmailVerification={isSendingEmailVerification}
            isUploadingAvatar={isUploadingAvatar}
            openAvatarGallery={openAvatarGallery}
            profileName={profileName}
            setProfileBio={setProfileBio}
            sendEmailVerificationLetter={sendEmailVerificationLetter}
            setIsEmailVerificationModalOpen={setIsEmailVerificationModalOpen}
          />
        ) : activeView === "favorites" ? (
          <FavoritesView
            cancelVoiceRecording={handleCancelVoiceRecording}
            currentProfile={currentProfile}
            currentUserId={user.id}
            editingMessage={editingMessage}
            favoriteItems={favoriteItems}
            forwardSelectedMessages={forwardSelectedMessages}
            friendProfile={
              friendProfile
                ? {
                    avatarUrl: friendProfile.avatar_url,
                    bio: friendProfile.bio,
                    name: friendProfile.display_name,
                    username: friendProfile.username,
                    updatedAt: friendProfile.updated_at,
                    userId: friendProfile.user_id,
                  }
                : null
            }
            getReadableMessageText={getReadableMessageText}
            handleAttachmentChange={handleAttachmentChange}
            handleAttachmentDrop={handleAttachmentDrop}
            handleFavoriteSelectionClick={handleFavoriteSelectionClick}
            handleMessageTextChange={handleMessageTextChange}
            imageInputRef={imageInputRef}
            isFavoriteSelectionMode={isFavoriteSelectionMode}
            isPinnedMessagesViewOpen={isPinnedMessagesViewOpen}
            isRecordingVoice={isRecordingVoice}
            isSelectedChatBlocked={isSelectedChatBlocked}
            isSelectedChatBlockedByMe={isSelectedChatBlockedByMe}
            isUploadingAttachment={isUploadingAttachment}
            messageInputRef={messageInputRef}
            messageText={messageText}
            openFavoriteContextMenu={openFavoriteContextMenu}
            pinnedFavoriteItem={pinnedFavoriteItem}
            profilesByUserId={profilesByUserId}
            replyTarget={replyTarget}
            requestBlockChange={requestBlockChange}
            removeSelectedFavoriteItems={removeSelectedFavoriteItems}
            selectedChatUserId={selectedChatUserId}
            selectedFavoriteItems={selectedFavoriteItems}
            selectedMessageIdSet={selectedMessageIdSet}
            sendMessage={sendMessage}
            setEditingMessage={setEditingMessage}
            setMessageText={setMessageText}
            setPinnedFavoriteItem={setPinnedFavoriteItem}
            setReplyTarget={setReplyTarget}
            setSelectedImageUrl={setSelectedImageUrl}
            setViewedProfile={setViewedProfile}
            stickerButtonRef={stickerButtonRef}
            toggleStickerPicker={toggleStickerPicker}
            toggleVoiceRecording={handleToggleVoiceRecording}
            voiceRecordingDuration={voiceRecordingDuration}
          />
        ) : activeView === "music" ? (
          <MusicView />
        ) : activeView === "access" ? (
          <AccessView canViewAccess={canViewAccess} currentUserId={user.id} />
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
            isProfileSearchable={isProfileSearchable}
            isSigningOut={isSigningOut}
            mutedProfiles={mutedProfiles}
            requestBlockChange={requestBlockChange}
            setAreSoftEffectsEnabled={setAreSoftEffectsEnabled}
            setIsLightThemeEnabled={setIsLightThemeEnabled}
            setIsOnlineStatusVisible={setIsOnlineStatusVisible}
            setIsProfileSearchable={setIsProfileSearchable}
            toggleNotifications={toggleNotifications}
            toggleStoredBooleanSetting={toggleStoredBooleanSetting}
            userEmail={user.email}
          />
        ) : selectedChatUserId === null ? (
          <ChatListView
            allFolderName={translations[interfaceLanguage].allChats}
            chatFolders={chatFolders}
            chatProfiles={visibleChatProfiles}
            currentUserId={user.id}
            isLoadingChats={!hasLoadedInitialMessages}
            latestVisibleMessageByProfileId={latestVisibleMessageByProfileId}
            messageReceiptStatuses={messageReceiptStatuses}
            openFolderContextMenu={openFolderContextMenu}
            openChatContextMenu={openChatContextMenu}
            openCreateChatFolderDialog={openCreateEmptyChatFolderDialog}
            pinnedChatProfileIds={pinnedChatProfileIds}
            reorderChatFolders={reorderChatFolders}
            selectedChatFolderId={selectedChatFolderId}
            setSelectedChatFolderId={setSelectedChatFolderId}
            setSelectedChatUserId={setSelectedChatUserId}
            setViewedProfile={setViewedProfile}
            unreadMessagesByUserId={unreadMessagesByUserId}
          />
        ) : (
          <OpenChatView
            key={`chat-${selectedChatUserId}`}
            toggleVoiceRecording={handleToggleVoiceRecording}
            cancelVoiceRecording={handleCancelVoiceRecording}
          />
        )}
      </AppShell>
      <DialogCoordinator />
    </>
  );
}

export default function Home() {
  const [activeToast, setActiveToast] = useState<{ message: ReactNode; key: number } | null>(null);

  const showToast = useCallback((message: ReactNode) => {
    setActiveToast({ message, key: Date.now() });
  }, []);

  return (
    <AppContextProvider>
      <AuthContextProvider>
        <SettingsContextProvider>
          <ProfilesContextProvider>
            <ChatContextProvider showToast={showToast}>
              <CallContextProvider>
                <MainContent />
                {activeToast ? (
                  <Toast key={activeToast.key} message={activeToast.message} onClose={() => setActiveToast(null)} />
                ) : null}
              </CallContextProvider>
            </ChatContextProvider>
          </ProfilesContextProvider>
        </SettingsContextProvider>
      </AuthContextProvider>
    </AppContextProvider>
  );
}
