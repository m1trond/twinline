import { useState } from "react";
import type { ChangeEvent, Dispatch, DragEvent, FormEvent, MouseEvent, RefObject, SetStateAction } from "react";
import type { ViewedProfileState } from "@/features/navigation/useNavigationState";
import type { FavoriteItem, MessageRow, ProfileRow } from "@/shared/types";
import { useI18n } from "@/shared/i18n-context";
import { NavIcon } from "@/components/navigation/NavButton";

// Subcomponents
import { FavoritePinnedBanner } from "./favorites/FavoritePinnedBanner";
import { FavoriteSelectionToolbar } from "./favorites/FavoriteSelectionToolbar";
import { ReplyEditingBanner } from "./favorites/ReplyEditingBanner";
import { FavoritesComposeForm } from "./favorites/FavoritesComposeForm";
import { FavoriteMessageBubble } from "./favorites/FavoriteMessageBubble";

type FavoritesViewProps = {
  cancelVoiceRecording: () => void;
  editingMessage: MessageRow | null;
  favoriteItems: FavoriteItem[];
  friendProfile: ViewedProfileState | null;
  currentProfile: ProfileRow | null;
  currentUserId: string | null;
  profilesByUserId: Map<string, ProfileRow>;
  forwardSelectedMessages: () => void;
  getReadableMessageText: (text: string) => string;
  handleAttachmentChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  handleAttachmentDrop: (files: FileList | File[]) => void | Promise<void>;
  handleMessageTextChange: (event: ChangeEvent<HTMLInputElement>) => void;
  imageInputRef: RefObject<HTMLInputElement | null>;
  isPinnedMessagesViewOpen: boolean;
  isRecordingVoice: boolean;
  isSelectedChatBlocked: boolean;
  isSelectedChatBlockedByMe: boolean;
  isUploadingAttachment: boolean;
  messageInputRef: RefObject<HTMLInputElement | null>;
  messageText: string;
  openFavoriteContextMenu: (event: MouseEvent<HTMLElement>, favoriteItem: FavoriteItem) => void;
  handleFavoriteSelectionClick: (event: MouseEvent<HTMLElement>, favoriteItem: FavoriteItem) => void;
  isFavoriteSelectionMode: boolean;
  pinnedFavoriteItem: FavoriteItem | null;
  replyTarget: MessageRow | null;
  requestBlockChange: (profileUserId: string, targetLabel: string) => void;
  selectedChatUserId: string | null;
  selectedFavoriteItems: FavoriteItem[];
  selectedMessageIdSet: Set<number>;
  sendMessage: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  setEditingMessage: (message: MessageRow | null) => void;
  setMessageText: Dispatch<SetStateAction<string>>;
  setPinnedFavoriteItem: (item: FavoriteItem | null) => void;
  setReplyTarget: (message: MessageRow | null) => void;
  setSelectedImageUrl: (url: string | null) => void;
  removeSelectedFavoriteItems: () => void;
  setViewedProfile: (profile: ViewedProfileState | null) => void;
  stickerButtonRef: RefObject<HTMLButtonElement | null>;
  toggleStickerPicker: () => void;
  toggleVoiceRecording: () => void;
  voiceRecordingDuration: number;
};

export function FavoritesView({
  cancelVoiceRecording,
  editingMessage,
  favoriteItems,
  friendProfile,
  currentProfile,
  currentUserId,
  profilesByUserId,
  forwardSelectedMessages,
  getReadableMessageText,
  handleAttachmentChange,
  handleAttachmentDrop,
  handleMessageTextChange,
  imageInputRef,
  isPinnedMessagesViewOpen,
  isRecordingVoice,
  isSelectedChatBlocked,
  isSelectedChatBlockedByMe,
  isUploadingAttachment,
  messageInputRef,
  messageText,
  openFavoriteContextMenu,
  handleFavoriteSelectionClick,
  isFavoriteSelectionMode,
  pinnedFavoriteItem,
  replyTarget,
  requestBlockChange,
  selectedChatUserId,
  selectedFavoriteItems,
  selectedMessageIdSet,
  sendMessage,
  setEditingMessage,
  setMessageText,
  setPinnedFavoriteItem,
  setReplyTarget,
  setSelectedImageUrl,
  removeSelectedFavoriteItems,
  setViewedProfile,
  stickerButtonRef,
  toggleStickerPicker,
  toggleVoiceRecording,
  voiceRecordingDuration,
}: FavoritesViewProps) {
  const { language, t } = useI18n();
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const isAttachmentDropDisabled = isUploadingAttachment || isRecordingVoice || isSelectedChatBlocked;

  function hasDraggedFiles(event: DragEvent<HTMLDivElement>) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function handleAttachmentDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();

    if (!isAttachmentDropDisabled) {
      setIsDraggingAttachment(true);
    }
  }

  function handleAttachmentDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = isAttachmentDropDisabled ? "none" : "copy";

    if (!isAttachmentDropDisabled) {
      setIsDraggingAttachment(true);
    }
  }

  function handleAttachmentDragLeave(event: DragEvent<HTMLDivElement>) {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    setIsDraggingAttachment(false);
  }

  function handleAttachmentDropEvent(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    setIsDraggingAttachment(false);

    if (!isAttachmentDropDisabled && event.dataTransfer.files.length > 0) {
      void handleAttachmentDrop(event.dataTransfer.files);
    }
  }

  return (
    <div
      className="hush-panel-transition relative flex min-h-0 flex-col overflow-hidden"
      onDragEnter={handleAttachmentDragEnter}
      onDragLeave={handleAttachmentDragLeave}
      onDragOver={handleAttachmentDragOver}
      onDrop={handleAttachmentDropEvent}
    >
      {isDraggingAttachment ? (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-xl border border-[#f4f4f5]/25 bg-black/70 p-4 backdrop-blur-sm sm:rounded-2xl">
          <div className="grid max-w-sm place-items-center rounded-2xl border border-dashed border-[#f4f4f5]/35 bg-[#111111]/88 px-6 py-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <p className="text-base font-medium text-[#f4f4f5]">
              {t("moveFileHere")}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
              {t("moveFileHereDescription")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-2 flex h-9 min-h-9 items-center rounded-lg border border-[#3f3f46]/45 bg-black px-2.5 py-0 shadow-[0_14px_45px_rgba(0,0,0,0.28)] sm:px-4">
        <div className="flex items-center gap-2.5 text-sm font-medium text-[#f4f4f5]">
          <NavIcon view="favorites" />
          <h2 className="leading-normal">{t("favorites")}</h2>
        </div>
      </div>

      <FavoriteSelectionToolbar
        forwardSelectedMessages={forwardSelectedMessages}
        isFavoriteSelectionMode={isFavoriteSelectionMode}
        removeSelectedFavoriteItems={removeSelectedFavoriteItems}
        selectedFavoriteItems={selectedFavoriteItems}
        t={t}
      />

      <FavoritePinnedBanner
        getReadableMessageText={getReadableMessageText}
        pinnedFavoriteItem={pinnedFavoriteItem}
        setPinnedFavoriteItem={setPinnedFavoriteItem}
        t={t}
      />

      <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-transparent p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] [overflow-anchor:none] sm:rounded-2xl sm:p-4">
        {favoriteItems.length === 0 ? (
          <div className="grid flex-1 place-items-center text-center">
            <div className="max-w-sm rounded-2xl border border-dashed border-[#3f3f46]/45 bg-black/20 p-5">
              <p className="text-sm font-medium">
                {t("favoritesEmptyTitle")}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
                {t("favoritesEmptyText")}
              </p>
            </div>
          </div>
        ) : null}

        {favoriteItems.map((favoriteItem, favoriteItemIndex) => {
          const previousFavoriteItem = favoriteItems[favoriteItemIndex - 1];
          const nextFavoriteItem = favoriteItems[favoriteItemIndex + 1];

          return (
            <FavoriteMessageBubble
              currentProfile={currentProfile}
              currentUserId={currentUserId}
              favoriteItem={favoriteItem}
              handleFavoriteSelectionClick={handleFavoriteSelectionClick}
              isFavoriteSelectionMode={isFavoriteSelectionMode}
              key={favoriteItem.id}
              language={language}
              nextFavoriteItem={nextFavoriteItem}
              openFavoriteContextMenu={openFavoriteContextMenu}
              previousFavoriteItem={previousFavoriteItem}
              profilesByUserId={profilesByUserId}
              selectedMessageIdSet={selectedMessageIdSet}
              setSelectedImageUrl={setSelectedImageUrl}
              setViewedProfile={setViewedProfile}
              t={t}
            />
          );
        })}
      </div>

      {isSelectedChatBlocked ? (
        <div className="mt-2 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl">
          {isSelectedChatBlockedByMe ? (
            <button
              className="min-h-11 w-full rounded-lg bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5] sm:rounded-xl"
              onClick={() => {
                if (selectedChatUserId && friendProfile?.name) {
                  requestBlockChange(
                    selectedChatUserId,
                    friendProfile.username
                      ? `@${friendProfile.username}`
                      : friendProfile.name,
                  );
                }
              }}
              type="button"
            >
              {t("unblockUser")}
            </button>
          ) : (
            <div className="flex min-h-11 items-center justify-center rounded-lg bg-[#f4f4f5]/12 px-4 text-sm font-medium text-[#a1a1aa] sm:rounded-xl">
              {t("youWereBlocked")}
            </div>
          )}
        </div>
      ) : !isPinnedMessagesViewOpen ? (
        <FavoritesComposeForm
          cancelVoiceRecording={cancelVoiceRecording}
          editingMessage={editingMessage}
          handleAttachmentChange={handleAttachmentChange}
          handleMessageTextChange={handleMessageTextChange}
          imageInputRef={imageInputRef}
          isRecordingVoice={isRecordingVoice}
          isUploadingAttachment={isUploadingAttachment}
          messageInputRef={messageInputRef}
          messageText={messageText}
          replyTarget={replyTarget}
          sendMessage={sendMessage}
          stickerButtonRef={stickerButtonRef}
          t={t}
          toggleStickerPicker={toggleStickerPicker}
          toggleVoiceRecording={toggleVoiceRecording}
          voiceRecordingDuration={voiceRecordingDuration}
        />
      ) : null}

      <ReplyEditingBanner
        editingMessage={editingMessage}
        getReadableMessageText={getReadableMessageText}
        replyTarget={replyTarget}
        setEditingMessage={setEditingMessage}
        setMessageText={setMessageText}
        setReplyTarget={setReplyTarget}
        t={t}
      />
    </div>
  );
}
