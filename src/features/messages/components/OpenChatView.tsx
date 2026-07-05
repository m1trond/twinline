import { useState, memo, useCallback } from "react";
import type { DragEvent } from "react";
import { useApp } from "@/shared/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useCall } from "@/features/calls/CallContext";
import { useChat } from "@/features/messages/contexts/ChatContext";
import { useI18n } from "@/shared/i18n-context";

// Components
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { MessageViewport } from "@/features/messages/components/MessageViewport";
import { MessageComposer } from "@/features/messages/components/MessageComposer";
import { MessageItem } from "@/features/messages/components/MessageItem";

// Utils & Helpers
import { formatLastSeen } from "@/shared/utils/profile";
import { getReadableMessageText } from "@/shared/utils/messages";

type OpenChatViewProps = {
  toggleVoiceRecording: () => void;
  cancelVoiceRecording: () => void;
};

export const OpenChatView = memo(
  function OpenChatView({
    toggleVoiceRecording,
    cancelVoiceRecording,
  }: OpenChatViewProps) {
    const { selectedChatUserId, setSelectedChatUserId, setViewedProfile } = useApp();
    const { user } = useAuth();
    const { callStatus, callStatusText, startCall } = useCall();
    const {
      activePinnedMessages,
      isPinnedMessagesViewOpen,
      setIsPinnedMessagesViewOpen,
      isMessageSelectionMode,
      selectedDialogMessages,
      forwardSelectedMessages,
      setIsSelectedDeleteDialogOpen,
      scrollToNextPinnedMessage,
      isFriendTyping,
      friendProfile,
      isDeletingChat,
      setChatDeleteTargetUserId,
      setIsChatDeleteDialogOpen,
      sendAttachment,
      isUploadingAttachment,
      isRecordingVoice,
      isSelectedChatBlocked,
    } = useChat();

    const { language, t } = useI18n();

    const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
    const [isCallConfirmOpen, setIsCallConfirmOpen] = useState(false);

    const isAttachmentDropDisabled = isUploadingAttachment || isRecordingVoice || isSelectedChatBlocked;

    const hasDraggedFiles = useCallback((event: DragEvent<HTMLDivElement>) => {
      return Array.from(event.dataTransfer.types).includes("Files");
    }, []);

    const handleAttachmentDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      if (!isAttachmentDropDisabled) {
        setIsDraggingAttachment(true);
      }
    }, [hasDraggedFiles, isAttachmentDropDisabled]);

    const handleAttachmentDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = isAttachmentDropDisabled ? "none" : "copy";
      if (!isAttachmentDropDisabled) {
        setIsDraggingAttachment(true);
      }
    }, [hasDraggedFiles, isAttachmentDropDisabled]);

    const handleAttachmentDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
      if (
        event.relatedTarget instanceof Node &&
        event.currentTarget.contains(event.relatedTarget)
      ) {
        return;
      }
      setIsDraggingAttachment(false);
    }, []);

    const handleAttachmentDropEvent = useCallback(async (event: DragEvent<HTMLDivElement>) => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      setIsDraggingAttachment(false);

      if (!isAttachmentDropDisabled && event.dataTransfer.files.length > 0) {
        for (const file of Array.from(event.dataTransfer.files)) {
          await sendAttachment(file);
        }
      }
    }, [hasDraggedFiles, isAttachmentDropDisabled, sendAttachment]);

    if (!user) return null;

    return (
      <div
        className="hush-panel-transition relative flex min-h-0 flex-1 flex-col overflow-hidden"
        onDragEnter={handleAttachmentDragEnter}
        onDragLeave={handleAttachmentDragLeave}
        onDragOver={handleAttachmentDragOver}
        onDrop={handleAttachmentDropEvent}
      >
        {isDraggingAttachment ? (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-xl border border-[#f4f4f5]/25 bg-black/70 p-4 backdrop-blur-sm sm:rounded-2xl">
            <div className="grid max-w-sm place-items-center rounded-2xl border border-dashed border-[#f4f4f5]/35 bg-[#111111]/88 px-6 py-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <p className="text-base font-medium text-[#f4f4f5]">{t("moveFileHere")}</p>
              <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
                {language === "en"
                  ? "Photos, videos, and documents will be sent to this chat."
                  : "Фото, видео и документы отправятся в этот чат."}
              </p>
            </div>
          </div>
        ) : null}

        {/* Chat Header */}
        <div className="mb-2 flex h-11 min-h-11 items-center justify-between gap-2 overflow-hidden rounded-xl sm:rounded-2xl border border-[#3f3f46]/45 bg-black pl-1 pr-1 py-1 shadow-[0_14px_45px_rgba(0,0,0,0.28)] sm:pl-1.5 sm:pr-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
            <button
              aria-label={t("messages")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#f4f4f5] transition hover:bg-white/10"
              onClick={() => setSelectedChatUserId(null)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path d="m15 18-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
            <div className="min-w-0">
              <button
                aria-label={language === "en" ? "Open profile" : "Открыть профиль"}
                className="block max-w-full cursor-pointer truncate rounded-none text-left text-sm font-medium leading-tight text-[#f4f4f5] outline-none transition hover:text-white focus:outline-none focus-visible:outline-none"
                onClick={() => {
                  setViewedProfile(
                    friendProfile
                      ? {
                          avatarUrl: friendProfile.avatar_url,
                          bio: friendProfile.bio,
                          name: friendProfile.display_name,
                          username: friendProfile.username,
                          updatedAt: friendProfile.updated_at,
                          userId: friendProfile.user_id,
                        }
                      : {
                          avatarUrl: null,
                          bio: null,
                          name: t("user"),
                          username: null,
                          updatedAt: null,
                          userId: null,
                        }
                  );
                }}
                type="button"
              >
                {friendProfile?.display_name ?? t("user")}
              </button>
              <p className="truncate text-xs leading-tight text-[#a1a1aa]">
                {isFriendTyping
                  ? language === "en" ? "typing..." : "печатает..."
                  : formatLastSeen(friendProfile?.updated_at ?? null, language)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
            <button
              aria-label={t("deleteChat")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#f4f4f5] transition hover:bg-red-500/12 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isDeletingChat}
              onClick={() => {
                setChatDeleteTargetUserId(selectedChatUserId);
                setIsChatDeleteDialogOpen(true);
              }}
              type="button"
            >
              {isDeletingChat ? (
                <span className="h-4 w-4 rounded-full border-2 border-red-100 border-t-transparent" />
              ) : (
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </button>
            <button
              aria-label={callStatus === "idle" ? t("call") : callStatusText}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#f4f4f5] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-[#71717a]"
              disabled={!friendProfile?.user_id || callStatus !== "idle"}
              onClick={() => setIsCallConfirmOpen(true)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path
                  d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Call Confirmation Dialog */}
        {isCallConfirmOpen ? (
          <ConfirmDialog
            cancelLabel={t("no")}
            confirmLabel={t("yes")}
            description={
              language === "en"
                ? `Start a call with ${friendProfile?.display_name ?? t("user")}?`
                : `Начать звонок с ${friendProfile?.display_name ?? t("user")}?`
            }
            icon={
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path
                  d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            }
            onCancel={() => setIsCallConfirmOpen(false)}
            onConfirm={() => {
              setIsCallConfirmOpen(false);
              void startCall();
            }}
            title={language === "en" ? "Confirm call" : "Подтвердить звонок"}
          />
        ) : null}

        {/* Selection Bar */}
        {isMessageSelectionMode ? (
          <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/88 px-3 py-2 text-[#f4f4f5] shadow-[0_12px_35px_rgba(0,0,0,0.25)] backdrop-blur-md sm:mb-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#d4d4d8]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#050505]">
                {selectedDialogMessages.length}
              </span>
              <span className="truncate">{t("selectedMessages")}</span>
            </div>
            <div className="flex flex-1 justify-end gap-2 sm:flex-none">
              <button
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#3f3f46]/55 bg-[#f4f4f5]/10 px-3 text-sm font-medium text-[#f4f4f5] transition hover:bg-[#f4f4f5]/16 sm:flex-none"
                onClick={forwardSelectedMessages}
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="m15 14 5-5-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <path d="M4 20v-7a4 4 0 0 1 4-4h12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                {t("forward")}
              </button>
              <button
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-red-400/45 bg-red-500/16 px-3 text-sm font-medium text-red-100 transition hover:bg-red-500/25 sm:flex-none"
                onClick={() => setIsSelectedDeleteDialogOpen(true)}
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                {t("delete")}
              </button>
            </div>
          </div>
        ) : null}

        {/* Pinned Messages Bar */}
        {activePinnedMessages.length > 0 ? (
          <div className="mb-2 flex min-h-9 shrink-0 overflow-hidden rounded-xl sm:rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/82 text-sm text-[#e5e5e5] shadow-[0_10px_30px_rgba(0,0,0,0.18)] sm:mb-3">
            <button
              className="flex min-w-0 flex-1 items-center gap-2 rounded-l-xl sm:rounded-l-2xl px-3 py-1.5 text-left transition-all duration-200 ease-out hover:bg-white/[0.06] hover:text-white"
              onClick={scrollToNextPinnedMessage}
              type="button"
            >
              <span className="shrink-0 font-medium text-[#f4f4f5]">
                {t("pinned")}: {activePinnedMessages.length}
              </span>
              <span className="min-w-0 truncate text-[#a1a1aa] transition-colors duration-200">
                {getReadableMessageText(activePinnedMessages.at(-1)?.text ?? "")}
              </span>
            </button>
            <button
              aria-label="Открыть все закрепы"
              className={`grid w-14 shrink-0 place-items-center rounded-r-xl sm:rounded-r-2xl border-l border-[#3f3f46]/35 transition-all duration-200 ease-out ${
                isPinnedMessagesViewOpen
                  ? "bg-[#f4f4f5]/14 text-[#f4f4f5]"
                  : "bg-white/[0.02] text-[#d4d4d8] hover:bg-white/[0.06] hover:text-[#f4f4f5]"
              }`}
              onClick={() => setIsPinnedMessagesViewOpen((isOpen) => !isOpen)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path d="M12 17v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 1z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
          </div>
        ) : null}

        {/* Viewport for messages */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Pinned Messages Overlay */}
          {isPinnedMessagesViewOpen ? (
            <div className="absolute inset-0 z-20 flex flex-col rounded-xl border border-[#3f3f46]/45 bg-[#050505]/96 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-4">
              {/* Pinned List Header */}
              <div className="mb-3 flex items-center justify-between border-b border-[#3f3f46]/35 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    aria-label={language === "en" ? "Back" : "Назад"}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[#3f3f46]/35 text-[#f4f4f5] transition hover:bg-white/10"
                    onClick={() => setIsPinnedMessagesViewOpen(false)}
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <path d="m15 18-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </button>
                  <span className="font-semibold text-[#f4f4f5]">
                    {t("pinned") || "Закрепленные сообщения"} ({activePinnedMessages.length})
                  </span>
                </div>
              </div>

              {/* Scrollable list of pinned messages */}
              <div className="scrollbar-hidden flex-1 overflow-y-auto">
                {activePinnedMessages.length === 0 ? (
                  <p className="text-sm text-[#a1a1aa]">
                    {language === "en" ? "No pinned messages yet." : "Закрепов пока нет."}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {activePinnedMessages.map((message, idx) => (
                      <MessageItem
                        key={message.client_key ?? message.id}
                        message={message}
                        messageIndex={idx}
                        messagesArray={activePinnedMessages}
                        isFromPinnedList={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <MessageViewport />
        </div>

        {/* Message Input & Actions */}
        <MessageComposer
          toggleVoiceRecording={toggleVoiceRecording}
          cancelVoiceRecording={cancelVoiceRecording}
        />
      </div>
    );
  }
);
