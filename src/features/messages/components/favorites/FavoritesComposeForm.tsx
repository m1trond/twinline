import type { ChangeEvent, FormEvent, RefObject } from "react";
import type { TranslationKey } from "@/shared/i18n";
import type { MessageRow } from "@/shared/types";
import { formatAudioTime } from "@/shared/utils/format";

type FavoritesComposeFormProps = {
  sendMessage: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  handleAttachmentChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  isUploadingAttachment: boolean;
  isRecordingVoice: boolean;
  voiceRecordingDuration: number;
  cancelVoiceRecording: () => void;
  handleMessageTextChange: (event: ChangeEvent<HTMLInputElement>) => void;
  editingMessage: MessageRow | null;
  replyTarget: MessageRow | null;
  messageInputRef: RefObject<HTMLInputElement | null>;
  messageText: string;
  toggleStickerPicker: () => void;
  stickerButtonRef: RefObject<HTMLButtonElement | null>;
  toggleVoiceRecording: () => void;
  t: (key: TranslationKey) => string;
};

export function FavoritesComposeForm({
  sendMessage,
  handleAttachmentChange,
  imageInputRef,
  isUploadingAttachment,
  isRecordingVoice,
  voiceRecordingDuration,
  cancelVoiceRecording,
  handleMessageTextChange,
  editingMessage,
  replyTarget,
  messageInputRef,
  messageText,
  toggleStickerPicker,
  stickerButtonRef,
  toggleVoiceRecording,
  t,
}: FavoritesComposeFormProps) {
  return (
    <form
      className="mt-2 grid grid-cols-[auto_1fr_auto_auto_auto] gap-1.5 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:flex sm:gap-2 sm:rounded-2xl"
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
        disabled={isUploadingAttachment || isRecordingVoice}
        onClick={() => imageInputRef.current?.click()}
        type="button"
      >
        {isUploadingAttachment ? (
          <span className="h-4 w-4 rounded-full border-2 border-[#f4f4f5] border-t-transparent" />
        ) : (
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="m8.5 12.5 5.9-5.9a3.2 3.2 0 0 1 4.5 4.5l-7.1 7.1a5 5 0 0 1-7.1-7.1l7.8-7.8"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
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
            aria-label="Текст избранного"
            className="min-h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm text-[#f4f4f5] outline-none transition placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] focus:bg-[#f4f4f5]/18 sm:px-3 sm:text-sm"
            onChange={handleMessageTextChange}
            placeholder={
              editingMessage
                ? `${t("edit")}...`
                : replyTarget
                  ? t("typeReply")
                  : t("typeFavorite")
            }
            ref={messageInputRef}
            type="text"
            value={messageText}
          />
          <button
            aria-label="Stickers"
            className="grid min-h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/12 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/18 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isUploadingAttachment}
            onClick={toggleStickerPicker}
            ref={stickerButtonRef}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M9 10h.01M15 10h.01M8.8 14.5c1.8 1.7 4.6 1.7 6.4 0"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </>
      )}

      <button
        aria-label={isRecordingVoice ? "Send voice" : "Record voice"}
        className={`relative grid min-h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border text-[#f4f4f5] transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isRecordingVoice
            ? "border-red-400/60 bg-red-500/85 text-white hover:bg-red-400 hush-send-btn-recording"
            : "border-[#3f3f46]/35 bg-[#f4f4f5]/12 hover:bg-[#f4f4f5]/18"
        }`}
        disabled={isUploadingAttachment}
        onClick={toggleVoiceRecording}
        type="button"
      >
        {isRecordingVoice ? (
          <svg
            aria-hidden="true"
            className="relative h-5 w-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M5 12 19 4l-3.8 16-3.6-6.1L5 12Z" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="M19 11a7 7 0 0 1-14 0M12 18v3M9 21h6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        )}
      </button>
    </form>
  );
}
