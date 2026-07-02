import { useCallback } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { useChat } from "@/features/messages/contexts/ChatContext";
import { useI18n } from "@/shared/i18n-context";
import { formatAudioTime } from "@/shared/utils/format";
import { getReadableMessageText } from "@/shared/utils/messages";

type MessageComposerProps = {
  toggleVoiceRecording: () => void;
  cancelVoiceRecording: () => void;
};

export function MessageComposer({
  toggleVoiceRecording,
  cancelVoiceRecording,
}: MessageComposerProps) {
  const { t } = useI18n();
  const {
    messageText,
    setMessageText,
    isUploadingAttachment,
    isRecordingVoice,
    voiceRecordingDuration,
    setIsStickerPickerOpen,
    setStickerPickerPosition,
    imageInputRef,
    messageInputRef,
    stickerButtonRef,
    sendMessage,
    sendAttachment,
    handleMessageTextChange,
    editingMessage,
    setEditingMessage,
    replyTarget,
    setReplyTarget,
    isPinnedMessagesViewOpen,
    setIsUnpinAllDialogOpen,
    activePinnedMessages,
    isSelectedChatBlocked,
    isSelectedChatBlockedByMe,
    isSelectedChatBlockingMe,
    errorMessage,
  } = useChat();

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

    setIsStickerPickerOpen((isOpen) => !isOpen);
  }, [stickerButtonRef, setIsStickerPickerOpen, setStickerPickerPosition]);

  const handleSendOrVoiceClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (isRecordingVoice) {
      toggleVoiceRecording();
      return;
    }

    const hasText = Boolean(messageInputRef.current?.value?.trim());
    if (hasText) {
      event.currentTarget.form?.requestSubmit();
    } else {
      toggleVoiceRecording();
    }
  }, [isRecordingVoice, toggleVoiceRecording, messageInputRef]);

  const handleAttachmentChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    for (const file of files) {
      await sendAttachment(file);
    }

    event.target.value = "";
  }, [sendAttachment]);

  return (
    <div className="mt-auto flex flex-col shrink-0">
      {!isPinnedMessagesViewOpen ? (
        <form
          className="mt-2 grid grid-cols-[auto_1fr_auto_auto_auto] gap-1.5 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:flex sm:gap-2 sm:rounded-2xl w-full"
          onSubmit={sendMessage}
        >
          <input
            className="hidden"
            multiple
            onChange={handleAttachmentChange}
            ref={imageInputRef}
            type="file"
          />
          <button
            aria-label={t("attachFile")}
            className="grid min-h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/12 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/18 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isUploadingAttachment || isRecordingVoice || isSelectedChatBlocked}
            onClick={() => imageInputRef.current?.click()}
            type="button"
          >
            {isUploadingAttachment ? (
              <span className="h-4 w-4 rounded-full border-2 border-[#f4f4f5] border-t-transparent" />
            ) : (
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path
                  d="m8.5 12.5 5.9-5.9a3.2 3.2 0 0 1 4.5 4.5l-7.1 7.1a5 5 0 0 1-7.1-7.1l7.8-7.8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  transform="translate(0.2, 1.25)"
                />
              </svg>
            )}
          </button>

          {isRecordingVoice ? (
            <div className="relative col-span-3 flex min-h-9 min-w-0 flex-1 items-center rounded-lg border border-red-400/35 bg-red-500/10 px-3 text-sm text-[#f4f4f5] sm:col-span-1">
              <div className="flex min-w-[86px] items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300 shadow-[0_0_14px_rgba(252,165,165,0.65)]" />
                <span className="font-medium tabular-nums text-red-100">
                  {formatAudioTime(voiceRecordingDuration)}
                </span>
              </div>
              <button
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg px-4 py-2 text-xs font-medium text-[#e5e5e5] transition hover:bg-white/10 hover:text-[#f4f4f5]"
                onClick={cancelVoiceRecording}
                type="button"
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
            <>
              <input
                aria-label="Текст сообщения"
                className="hush-chat-input min-h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm text-[#f4f4f5] outline-none transition placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] focus:bg-[#f4f4f5]/18 sm:px-3 sm:text-sm"
                disabled={isSelectedChatBlocked}
                onChange={handleMessageTextChange}
                placeholder={
                  isSelectedChatBlockedByMe
                    ? t("userBlocked")
                    : isSelectedChatBlockingMe
                      ? t("youWereBlocked")
                      : editingMessage
                        ? `${t("edit")}...`
                        : replyTarget
                          ? t("typeReply")
                          : t("startMessage")
                }
                ref={messageInputRef}
                type="text"
                defaultValue={messageText}
              />
              <button
                aria-label="Stickers"
                className="grid min-h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/12 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/18 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isUploadingAttachment || isSelectedChatBlocked}
                onClick={toggleStickerPicker}
                ref={stickerButtonRef}
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <line x1="9" x2="9.01" y1="9.5" y2="9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <line x1="15" x2="15.01" y1="9.5" y2="9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </>
          )}

          <button
            aria-label={isRecordingVoice ? "Отправить голосовое" : "Записать голосовое"}
            className={`hush-send-btn relative grid min-h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border text-[#f4f4f5] transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isRecordingVoice
                ? "border-red-400/60 bg-red-500/85 text-white hover:bg-red-400 hush-send-btn-recording"
                : "border-[#3f3f46]/35 bg-[#f4f4f5]/12 hover:bg-[#f4f4f5]/18"
            }`}
            disabled={isUploadingAttachment || isSelectedChatBlocked}
            onClick={handleSendOrVoiceClick}
            type="button"
          >
            {isRecordingVoice ? (
              <>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-lg border border-white/40 transition duration-75 hush-voice-wave-outer"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-1 rounded-md bg-white/18 transition-transform duration-75 hush-voice-wave-inner"
                />
                <svg aria-hidden="true" className="relative h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M3 3l18 9-18 9 4-9-4-9z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M7 12h14"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </>
            ) : (
              <>
                <svg aria-hidden="true" className="hush-mic-icon h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M19 10v1a7 7 0 0 1-14 0v-1"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <line x1="12" x2="12" y1="19" y2="22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                <svg aria-hidden="true" className="hush-send-icon h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M3 3l18 9-18 9 4-9-4-9z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M7 12h14"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </>
            )}
          </button>
        </form>
      ) : null}

      {isPinnedMessagesViewOpen && activePinnedMessages.length > 0 ? (
        <button
          className="mt-2 min-h-11 w-full rounded-xl border border-red-400/25 bg-red-500/10 px-4 text-sm font-medium text-red-100 shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition hover:border-red-300/40 hover:bg-red-500/16 sm:rounded-2xl"
          onClick={() => setIsUnpinAllDialogOpen(true)}
          type="button"
        >
          {t("unpin")} {activePinnedMessages.length}
        </button>
      ) : null}

      {!isPinnedMessagesViewOpen && (replyTarget || editingMessage) ? (
        <div className="mt-2 flex min-h-9 items-center justify-between gap-2 rounded-lg border border-[#3f3f46]/35 bg-[#111111]/82 px-3 py-1.5 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-md sm:gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#e5e5e5]">
              {editingMessage ? t("editing") : t("reply")}
            </p>
            <p className="mt-1 truncate font-medium text-[#f4f4f5]">
              {getReadableMessageText((editingMessage ?? replyTarget)?.text ?? "")}
            </p>
          </div>
          <button
            className="min-h-8 shrink-0 rounded-lg border border-[#3f3f46]/35 px-3 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={() => {
              setReplyTarget(null);
              setEditingMessage(null);
              setMessageText("");
            }}
            type="button"
          >
            {t("cancel")}
          </button>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="mt-2 text-sm font-medium text-[#e5e5e5]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
