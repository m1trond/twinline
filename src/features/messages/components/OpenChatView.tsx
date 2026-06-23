import { useEffect, useRef, useState, memo } from "react";
import type {
  ChangeEvent,
  DragEvent,
  Dispatch,
  FormEvent,
  MouseEvent,
  RefObject,
  SetStateAction,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { ViewedProfileState } from "@/features/navigation/useNavigationState";
import type { MessageRow, ProfileRow, ReplyMessagePayload } from "@/shared/types";
import { FileAttachment } from "@/features/messages/components/FileAttachment";
import { MessageReceiptIcon } from "@/features/messages/components/MessageReceiptIcon";
import { VoiceMessage } from "@/features/messages/components/VoiceMessage";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useI18n } from "@/shared/i18n-context";
import { formatAudioTime, formatCallDuration, formatMessageTime } from "@/shared/utils/format";
import { formatLastSeen } from "@/shared/utils/profile";
import {
  getMessageAudioUrl,
  getMessageAttachmentCaption,
  getMessageCallDuration,
  getMessageFilePayload,
  getMessageForward,
  getMessageImageUrl,
  getMessageReply,
  getMessageSticker,
  getMessageVideoUrl,
} from "@/shared/utils/messages";

type OpenChatViewProps = {
  activePinnedMessageIdSet: Set<number>;
  activePinnedMessages: MessageRow[];
  activeUserName: string;
  callStatus: string;
  callStatusText: string;
  cancelVoiceRecording: () => void;
  currentProfile: ProfileRow | null;
  editingMessage: MessageRow | null;
  errorMessage: string;
  forwardSelectedMessages: () => void;
  friendProfile: ViewedProfileState | null;
  getReadableMessageText: (text: string) => string;
  handleAttachmentChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  handleAttachmentDrop: (files: FileList | File[]) => void | Promise<void>;
  handleMessageSelectionClick: (event: MouseEvent<HTMLElement>, message: MessageRow) => void;
  handleMessageTextChange: (event: ChangeEvent<HTMLInputElement>) => void;
  highlightedMessageId: number | null;
  highlightMessage?: (messageId: number) => boolean;
  imageInputRef: RefObject<HTMLInputElement | null>;
  isDeletingChat: boolean;
  isFriendTyping: boolean;
  isLoadingMessages: boolean;
  isMessageSelectionMode: boolean;
  isPinnedMessagesViewOpen: boolean;
  isRecordingVoice: boolean;
  isSelectedChatBlocked: boolean;
  isSelectedChatBlockedByMe: boolean;
  isSelectedChatBlockingMe: boolean;
  isUploadingAttachment: boolean;
  messageInputRef: RefObject<HTMLInputElement | null>;
  messagesBottomAnchorRef: RefObject<HTMLDivElement | null>;
  messageReceiptStatuses: Map<number, "delivered" | "read">;
  messageText: string;
  messagesListRef: RefObject<HTMLDivElement | null>;
  openMessageContextMenu: (event: MouseEvent<HTMLElement>, message: MessageRow) => void;
  playedVoiceMessageIds: Set<number>;
  profilesByUserId: Map<string, ProfileRow>;
  replyTarget: MessageRow | null;
  scrollToNextPinnedMessage: () => void;
  scrollToReplyMessage: (reply: ReplyMessagePayload) => void;
  selectedChatUserId: string;
  selectedDialogMessages: MessageRow[];
  selectedMessageIdSet: Set<number>;
  sendMessage: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  setChatDeleteTargetUserId: (userId: string | null) => void;
  setEditingMessage: (message: MessageRow | null) => void;
  setIsChatDeleteDialogOpen: (isOpen: boolean) => void;
  setIsPinnedMessagesViewOpen: Dispatch<SetStateAction<boolean>>;
  setIsSelectedDeleteDialogOpen: (isOpen: boolean) => void;
  setIsUnpinAllDialogOpen: (isOpen: boolean) => void;
  setMessageText: Dispatch<SetStateAction<string>>;
  setReplyTarget: (message: MessageRow | null) => void;
  setSelectedChatUserId: (userId: string | null) => void;
  setSelectedImageUrl: (url: string | null) => void;
  setViewedProfile: (profile: ViewedProfileState | null) => void;
  startCall: (targetUserId?: string | null) => void | Promise<void>;
  stickerButtonRef: RefObject<HTMLButtonElement | null>;
  toggleStickerPicker: () => void;
  toggleVoiceRecording: () => void;
  markVoiceMessagePlayed: (message: MessageRow) => void;
  user: User;
  visibleDialogMessages: MessageRow[];
  visibleDialogMessagesCount: number;
  voiceRecordingDuration: number;
};

export function OpenChatView({
  activePinnedMessageIdSet,
  activePinnedMessages,
  activeUserName,
  callStatus,
  callStatusText,
  cancelVoiceRecording,
  currentProfile,
  editingMessage,
  errorMessage,
  forwardSelectedMessages,
  friendProfile,
  getReadableMessageText,
  handleAttachmentChange,
  handleAttachmentDrop,
  handleMessageSelectionClick,
  handleMessageTextChange,
  highlightedMessageId,
  highlightMessage,
  imageInputRef,
  isDeletingChat,
  isFriendTyping,
  isLoadingMessages,
  isMessageSelectionMode,
  isPinnedMessagesViewOpen,
  isRecordingVoice,
  isSelectedChatBlocked,
  isSelectedChatBlockedByMe,
  isSelectedChatBlockingMe,
  isUploadingAttachment,
  messageInputRef,
  messagesBottomAnchorRef,
  messageReceiptStatuses,
  messageText,
  messagesListRef,
  openMessageContextMenu,
  playedVoiceMessageIds,
  profilesByUserId,
  replyTarget,
  scrollToNextPinnedMessage,
  scrollToReplyMessage,
  selectedChatUserId,
  selectedDialogMessages,
  selectedMessageIdSet,
  sendMessage,
  setChatDeleteTargetUserId,
  setEditingMessage,
  setIsChatDeleteDialogOpen,
  setIsPinnedMessagesViewOpen,
  setIsSelectedDeleteDialogOpen,
  setIsUnpinAllDialogOpen,
  setMessageText,
  setReplyTarget,
  setSelectedChatUserId,
  setSelectedImageUrl,
  setViewedProfile,
  startCall,
  stickerButtonRef,
  toggleStickerPicker,
  toggleVoiceRecording,
  markVoiceMessagePlayed,
  user,
  visibleDialogMessages,
  visibleDialogMessagesCount,
  voiceRecordingDuration,
}: OpenChatViewProps) {
  const { language, t } = useI18n();
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const [isCallConfirmOpen, setIsCallConfirmOpen] = useState(false);
  const scrollButtonRef = useRef<HTMLButtonElement | null>(null);
  const scrollbarTrackRef = useRef<HTMLDivElement | null>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const button = scrollButtonRef.current;
    if (button) {
      button.classList.remove("opacity-100");
      button.classList.add("opacity-0", "pointer-events-none");
    }
    const track = scrollbarTrackRef.current;
    if (track) {
      track.classList.remove("opacity-100");
      track.classList.add("opacity-0", "pointer-events-none");
    }
  }, [selectedChatUserId]);

  useEffect(() => {
    if (isPinnedMessagesViewOpen) {
      const button = scrollButtonRef.current;
      if (button) {
        button.classList.remove("opacity-100");
        button.classList.add("opacity-0", "pointer-events-none");
      }
      const track = scrollbarTrackRef.current;
      if (track) {
        track.classList.remove("opacity-100");
        track.classList.add("opacity-0", "pointer-events-none");
      }
    } else {
      const messagesList = messagesListRef.current;
      if (messagesList) {
        const maxScrollTop = messagesList.scrollHeight - messagesList.clientHeight;
        const isUp = maxScrollTop - messagesList.scrollTop > 450;
        const button = scrollButtonRef.current;
        if (button) {
          if (isUp) {
            button.classList.remove("opacity-0", "pointer-events-none");
            button.classList.add("opacity-100");
          } else {
            button.classList.remove("opacity-100");
            button.classList.add("opacity-0", "pointer-events-none");
          }
        }
        const track = scrollbarTrackRef.current;
        const thumb = scrollbarThumbRef.current;
        if (track && thumb) {
          if (isUp && maxScrollTop > 0) {
            track.classList.remove("opacity-0", "pointer-events-none");
            track.classList.add("opacity-100");
            const trackHeight = track.clientHeight;
            const visibleRatio = messagesList.clientHeight / messagesList.scrollHeight;
            const thumbHeight = Math.max(20, trackHeight * visibleRatio);
            const scrollableTrack = trackHeight - thumbHeight;
            const scrollableContent = messagesList.scrollHeight - messagesList.clientHeight;
            const scrollProgress = scrollableContent > 0 ? messagesList.scrollTop / scrollableContent : 0;
            const thumbTranslateY = scrollProgress * scrollableTrack;
            thumb.style.height = `${thumbHeight}px`;
            thumb.style.transform = `translateY(${thumbTranslateY}px)`;
          } else {
            track.classList.remove("opacity-100");
            track.classList.add("opacity-0", "pointer-events-none");
          }
        }
      }
    }
  }, [isPinnedMessagesViewOpen]);

  useEffect(() => {
    if (messageInputRef.current && messageInputRef.current.value !== messageText) {
      messageInputRef.current.value = messageText;
    }
  }, [messageText, messageInputRef]);

  useEffect(() => {
    const track = scrollbarTrackRef.current;
    const thumb = scrollbarThumbRef.current;
    const viewport = messagesListRef.current;

    if (!track || !thumb || !viewport) {
      return;
    }

    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    const handlePointerDown = (event: PointerEvent) => {
      event.preventDefault();
      const target = event.target as HTMLElement;

      if (target === thumb) {
        isDragging = true;
        startY = event.clientY;
        startScrollTop = viewport.scrollTop;
        thumb.setPointerCapture(event.pointerId);
        thumb.classList.remove("bg-white/32", "hover:bg-white/45");
        thumb.classList.add("bg-white/60");
        return;
      }

      if (target === track) {
        const rect = track.getBoundingClientRect();
        const clickY = event.clientY - rect.top;
        const visibleRatio = viewport.clientHeight / viewport.scrollHeight;
        const thumbHeight = Math.max(20, rect.height * visibleRatio);

        const scrollableTrack = rect.height - thumbHeight;
        const clickProgress = scrollableTrack > 0 ? (clickY - thumbHeight / 2) / scrollableTrack : 0;
        const clampedProgress = Math.max(0, Math.min(1, clickProgress));

        const maxScroll = viewport.scrollHeight - viewport.clientHeight;
        viewport.scrollTop = clampedProgress * maxScroll;

        isDragging = true;
        startY = event.clientY;
        startScrollTop = viewport.scrollTop;

        thumb.setPointerCapture(event.pointerId);
        thumb.classList.remove("bg-white/32", "hover:bg-white/45");
        thumb.classList.add("bg-white/60");
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }

      const deltaY = event.clientY - startY;
      const trackHeight = track.clientHeight;
      const visibleRatio = viewport.clientHeight / viewport.scrollHeight;
      const thumbHeight = Math.max(20, trackHeight * visibleRatio);

      const scrollableTrack = trackHeight - thumbHeight;
      const scrollableContent = viewport.scrollHeight - viewport.clientHeight;

      if (scrollableTrack > 0) {
        const scrollDelta = (deltaY / scrollableTrack) * scrollableContent;
        viewport.scrollTop = startScrollTop + scrollDelta;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }

      isDragging = false;
      thumb.releasePointerCapture(event.pointerId);
      thumb.classList.remove("bg-white/60");
      thumb.classList.add("bg-white/32", "hover:bg-white/45");
    };

    track.addEventListener("pointerdown", handlePointerDown);
    thumb.addEventListener("pointermove", handlePointerMove);
    thumb.addEventListener("pointerup", handlePointerUp);
    thumb.addEventListener("pointercancel", handlePointerUp);

    return () => {
      track.removeEventListener("pointerdown", handlePointerDown);
      thumb.removeEventListener("pointermove", handlePointerMove);
      thumb.removeEventListener("pointerup", handlePointerUp);
      thumb.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [selectedChatUserId]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const maxScrollTop = target.scrollHeight - target.clientHeight;
    const isUp = maxScrollTop - target.scrollTop > 450;

    const button = scrollButtonRef.current;
    if (button) {
      if (isUp && !isPinnedMessagesViewOpen) {
        button.classList.remove("opacity-0", "pointer-events-none");
        button.classList.add("opacity-100");
      } else {
        button.classList.remove("opacity-100");
        button.classList.add("opacity-0", "pointer-events-none");
      }
    }

    const track = scrollbarTrackRef.current;
    const thumb = scrollbarThumbRef.current;
    if (track && thumb) {
      if (isUp && maxScrollTop > 0 && !isPinnedMessagesViewOpen) {
        track.classList.remove("opacity-0", "pointer-events-none");
        track.classList.add("opacity-100");

        const trackHeight = track.clientHeight;
        const visibleRatio = target.clientHeight / target.scrollHeight;
        const thumbHeight = Math.max(20, trackHeight * visibleRatio);
        
        const scrollableTrack = trackHeight - thumbHeight;
        const scrollableContent = target.scrollHeight - target.clientHeight;
        const scrollProgress = scrollableContent > 0 ? target.scrollTop / scrollableContent : 0;
        const thumbTranslateY = scrollProgress * scrollableTrack;

        thumb.style.height = `${thumbHeight}px`;
        thumb.style.transform = `translateY(${thumbTranslateY}px)`;
      } else {
        track.classList.remove("opacity-100");
        track.classList.add("opacity-0", "pointer-events-none");
      }
    }
  };

  const scrollToBottom = () => {
    const messagesList = messagesListRef.current;
    if (messagesList) {
      messagesList.scrollTo({
        top: messagesList.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleImageLoad = (messageUserId: string | null) => {
    const messagesList = messagesListRef.current;
    if (!messagesList) return;

    const isOwnMessage = messageUserId === user.id;
    const isNearBottom = messagesList.scrollHeight - messagesList.clientHeight - messagesList.scrollTop < 550;

    if (isOwnMessage || isNearBottom) {
      requestAnimationFrame(() => {
        messagesList.scrollTop = messagesList.scrollHeight;
      });
    }
  };

  const handleSendOrVoiceClick = (event: React.MouseEvent<HTMLButtonElement>) => {
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
  };

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



  return (<div
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
                        {language === "en"
                          ? "Photos, videos, and documents will be sent to this chat."
                          : "Фото, видео и документы отправятся в этот чат."}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="mb-2 flex h-11 min-h-11 items-center justify-between gap-2 overflow-hidden rounded-xl sm:rounded-2xl border border-[#3f3f46]/45 bg-black px-2.5 py-1 shadow-[0_14px_45px_rgba(0,0,0,0.28)] sm:px-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                    <button
                      aria-label={t("messages")}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 text-[#f4f4f5] transition hover:bg-white/10 sm:rounded-xl"
                      onClick={() => setSelectedChatUserId(null)}
                      type="button"
                    >
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="m15 18-6-6 6-6"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                    <div className="min-w-0">
                      <button
                        aria-label={language === "en" ? "Open profile" : "Открыть профиль"}
                        className="block max-w-full cursor-pointer truncate rounded-none text-left text-sm font-medium leading-tight text-[#f4f4f5] outline-none transition hover:text-white focus:outline-none focus-visible:outline-none"
                        onClick={() => {
                          setViewedProfile(
                            friendProfile ?? {
                              avatarUrl: null,
                              bio: null,
                              name: t("user"),
                              username: null,
                              updatedAt: null,
                              userId: null,
                            },
                          );
                        }}
                        type="button"
                      >
                        {friendProfile?.name ?? t("user")}
                      </button>
                      <p className="truncate text-xs leading-tight text-[#a1a1aa]">
                        {isFriendTyping
                          ? language === "en" ? "typing..." : "печатает..."
                          : formatLastSeen(friendProfile?.updatedAt ?? null, language)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <button
                      aria-label={t("deleteChat")}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 text-[#f4f4f5] transition hover:border-red-400/45 hover:bg-red-500/12 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-55 sm:rounded-xl"
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
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 text-[#f4f4f5] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:border-[#3f3f46]/25 disabled:text-[#71717a] sm:rounded-xl"
                      disabled={!friendProfile?.userId || callStatus !== "idle"}
                      onClick={() => setIsCallConfirmOpen(true)}
                      type="button"
                    >
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                {isCallConfirmOpen ? (
                  <ConfirmDialog
                    cancelLabel={t("no")}
                    confirmLabel={t("yes")}
                    description={
                      language === "en"
                        ? `Start a call with ${friendProfile?.name ?? t("user")}?`
                        : `Начать звонок с ${friendProfile?.name ?? t("user")}?`
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
                {isMessageSelectionMode ? (
                  <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/88 px-3 py-2 text-[#f4f4f5] shadow-[0_12px_35px_rgba(0,0,0,0.25)] backdrop-blur-md sm:mb-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#d4d4d8]">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#050505]">
                        {selectedDialogMessages.length}
                      </span>
                      <span className="truncate">
                        {t("selectedMessages")}
                      </span>
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
                        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </button>
                  </div>
                ) : null}

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
                                activePinnedMessageIdSet={activePinnedMessageIdSet}
                                activeUserName={activeUserName}
                                currentProfile={currentProfile}
                                handleMessageSelectionClick={handleMessageSelectionClick}
                                highlightMessage={highlightMessage}
                                highlightedMessageId={highlightedMessageId}
                                isFromPinnedList={true}
                                isMessageSelectionMode={isMessageSelectionMode}
                                setIsPinnedMessagesViewOpen={setIsPinnedMessagesViewOpen}
                                key={message.client_key ?? message.id}
                                language={language}
                                markVoiceMessagePlayed={markVoiceMessagePlayed}
                                message={message}
                                messageIndex={idx}
                                messageReceiptStatuses={messageReceiptStatuses}
                                messagesArray={activePinnedMessages}
                                openMessageContextMenu={openMessageContextMenu}
                                playedVoiceMessageIds={playedVoiceMessageIds}
                                profilesByUserId={profilesByUserId}
                                scrollToReplyMessage={scrollToReplyMessage}
                                selectedMessageIdSet={selectedMessageIdSet}
                                setSelectedImageUrl={setSelectedImageUrl}
                                setViewedProfile={setViewedProfile}
                                t={t}
                                user={user}
                                onImageLoad={handleImageLoad}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <MessageViewport
                    activePinnedMessageIdSet={activePinnedMessageIdSet}
                    activeUserName={activeUserName}
                    currentProfile={currentProfile}
                    handleMessageSelectionClick={handleMessageSelectionClick}
                    highlightMessage={highlightMessage}
                    highlightedMessageId={highlightedMessageId}
                    isMessageSelectionMode={isMessageSelectionMode}
                    setIsPinnedMessagesViewOpen={setIsPinnedMessagesViewOpen}
                    language={language}
                    markVoiceMessagePlayed={markVoiceMessagePlayed}
                    messageReceiptStatuses={messageReceiptStatuses}
                    visibleDialogMessages={visibleDialogMessages}
                    openMessageContextMenu={openMessageContextMenu}
                    playedVoiceMessageIds={playedVoiceMessageIds}
                    profilesByUserId={profilesByUserId}
                    scrollToReplyMessage={scrollToReplyMessage}
                    selectedMessageIdSet={selectedMessageIdSet}
                    setSelectedImageUrl={setSelectedImageUrl}
                    setViewedProfile={setViewedProfile}
                    t={t}
                    user={user}
                    isLoadingMessages={isLoadingMessages}
                    visibleDialogMessagesCount={visibleDialogMessagesCount}
                    messagesListRef={messagesListRef}
                    handleScroll={handleScroll}
                    messagesBottomAnchorRef={messagesBottomAnchorRef}
                    scrollbarTrackRef={scrollbarTrackRef}
                    scrollbarThumbRef={scrollbarThumbRef}
                    scrollToBottom={scrollToBottom}
                    scrollButtonRef={scrollButtonRef}
                    onImageLoad={handleImageLoad}
                  />
                </div>

                {!isPinnedMessagesViewOpen ? (
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
                    disabled={isUploadingAttachment || isRecordingVoice || isSelectedChatBlocked}
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
                            d="M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                          <line
                            x1="9"
                            x2="9.01"
                            y1="9.5"
                            y2="9.5"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                          <line
                            x1="15"
                            x2="15.01"
                            y1="9.5"
                            y2="9.5"
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
                        <svg
                          aria-hidden="true"
                          className="relative h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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
                        <svg
                          aria-hidden="true"
                          className="hush-mic-icon h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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
                          <line
                            x1="12"
                            x2="12"
                            y1="19"
                            y2="22"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                        <svg
                          aria-hidden="true"
                          className="hush-send-icon h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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

type MessageItemProps = {
  message: MessageRow;
  messageIndex: number;
  messagesArray: MessageRow[];
  isFromPinnedList?: boolean;
  user: User;
  selectedMessageIdSet: Set<number>;
  activePinnedMessageIdSet: Set<number>;
  messageReceiptStatuses: Map<number, "delivered" | "read">;
  profilesByUserId: Map<string, ProfileRow>;
  currentProfile: ProfileRow | null;
  highlightedMessageId: number | null;
  isMessageSelectionMode: boolean;
  playedVoiceMessageIds: Set<number>;
  language: string;
  t: (key: any) => string;
  activeUserName: string;
  highlightMessage?: (messageId: number) => boolean;
  setIsPinnedMessagesViewOpen: Dispatch<SetStateAction<boolean>>;
  handleMessageSelectionClick: (event: MouseEvent<HTMLElement>, message: MessageRow) => void;
  setViewedProfile: (profile: ViewedProfileState | null) => void;
  scrollToReplyMessage: (reply: ReplyMessagePayload) => void;
  openMessageContextMenu: (event: MouseEvent<HTMLElement>, message: MessageRow) => void;
  setSelectedImageUrl: (url: string | null) => void;
  markVoiceMessagePlayed: (message: MessageRow) => void;
  onImageLoad?: (messageUserId: string | null) => void;
};

const MessageItem = memo(
  function MessageItem({
    message,
    messageIndex,
    messagesArray,
    isFromPinnedList = false,
    user,
    selectedMessageIdSet,
    activePinnedMessageIdSet,
    messageReceiptStatuses,
    profilesByUserId,
    currentProfile,
    highlightedMessageId,
    isMessageSelectionMode,
    playedVoiceMessageIds,
    language,
    t,
    activeUserName,
    highlightMessage,
    setIsPinnedMessagesViewOpen,
    handleMessageSelectionClick,
    setViewedProfile,
    scrollToReplyMessage,
    openMessageContextMenu,
    setSelectedImageUrl,
    markVoiceMessagePlayed,
    onImageLoad,
  }: MessageItemProps) {
    const isMine = message.user_id === user.id;
    const previousMessage = messagesArray[messageIndex - 1];
    const nextMessage = messagesArray[messageIndex + 1];
    const isPreviousSameAuthor =
      previousMessage?.user_id === message.user_id;
    const isNextSameAuthor = nextMessage?.user_id === message.user_id;
    const isSelected = selectedMessageIdSet.has(message.id);
    const isPinned = activePinnedMessageIdSet.has(message.id);
    const receiptStatus =
      isMine && message.id > 0
        ? messageReceiptStatuses.get(message.id) ?? "delivered"
        : isMine && message.id < 0
          ? "delivered"
          : null;
    const messageProfile = message.user_id
      ? profilesByUserId.get(message.user_id)
      : null;
    const messageAuthor = messageProfile?.display_name ?? message.author;
    const shouldShowFriendAvatar = !isMine && !isNextSameAuthor;
    const shouldShowOwnAvatar = isMine && !isNextSameAuthor;
    const reply = getMessageReply(message.text);
    const rawDisplayText = reply?.body ?? message.text;
    const forwarded = getMessageForward(rawDisplayText);
    const forwardedProfile = forwarded?.authorUserId
      ? forwarded.authorUserId === user.id
        ? currentProfile
        : profilesByUserId.get(forwarded.authorUserId)
      : null;
    const forwardedName =
      forwardedProfile?.display_name ?? forwarded?.authorName ?? "";
    const displayText = forwarded?.text ?? rawDisplayText;
    const imageUrl = getMessageImageUrl(displayText);
    const videoUrl = getMessageVideoUrl(displayText);
    const audioUrl = getMessageAudioUrl(displayText);
    const filePayload = getMessageFilePayload(displayText);
    const attachmentCaption = getMessageAttachmentCaption(displayText);
    const callDurationSeconds = getMessageCallDuration(displayText);
    const sticker = getMessageSticker(displayText);
    const hasCaptionableAttachment = Boolean(imageUrl || videoUrl || audioUrl);
    const hasFramedMedia = Boolean(imageUrl || videoUrl || filePayload);
    const hasAttachment = Boolean(
      imageUrl || videoUrl || audioUrl || filePayload || callDurationSeconds !== null || sticker,
    );
    const hasStandaloneBubble = Boolean(
      audioUrl || filePayload || callDurationSeconds !== null || sticker,
    );

    return (
      <article
        className={`hush-message-row -mx-1 flex items-end gap-1.5 rounded-xl px-1 py-1 transition-[background-color,box-shadow] duration-300 sm:gap-2 sm:rounded-2xl ${
          isFromPinnedList
            ? "cursor-pointer hover:bg-white/[0.03]"
            : ""
        } ${
          highlightedMessageId === message.id
            ? "bg-[#f4f4f5]/12 shadow-[0_0_0_2px_rgba(244,244,245,0.26),0_0_38px_rgba(244,244,245,0.12)]"
            : isSelected
              ? "bg-[#f4f4f5]/8 shadow-[0_0_0_1px_rgba(244,244,245,0.12)]"
              : "shadow-[0_0_0_0_rgba(244,244,245,0)]"
        } ${
          isPreviousSameAuthor ? "mt-1" : "mt-3"
        } ${isMine ? "justify-end" : "justify-start"}`}
        data-message-id={message.id}
        onClickCapture={(event) => {
          if (isFromPinnedList) {
            event.stopPropagation();
            if (highlightMessage) {
              highlightMessage(message.id);
            }
            setIsPinnedMessagesViewOpen(false);
          } else {
            handleMessageSelectionClick(event, message);
          }
        }}
      >
        {isMessageSelectionMode && isMine ? (
          <span
            className={`mb-1 grid h-6 w-6 shrink-0 place-items-center transition ${
              isSelected
                ? "text-[#f4f4f5]"
                : "text-transparent"
            }`}
          >
            <MessageCircleCheckIcon />
          </span>
        ) : null}
        {!isMine ? (
          shouldShowFriendAvatar ? (
            <button
              className="hush-avatar grid h-7 w-7 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-xs font-medium text-[#050505] transition sm:h-8 sm:w-8 sm:text-xs"
              onClick={(e) => {
                if (isFromPinnedList) e.stopPropagation();
                setViewedProfile({
                  avatarUrl: messageProfile?.avatar_url ?? null,
                  bio: messageProfile?.bio ?? null,
                  name: messageAuthor,
                  username: messageProfile?.username ?? null,
                  updatedAt: messageProfile?.updated_at ?? null,
                  userId: message.user_id,
                });
              }}
              type="button"
            >
              {messageProfile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Аватар собеседника"
                  className="h-full w-full object-cover"
                  src={messageProfile.avatar_url}
                />
              ) : (
                messageAuthor[0]?.toUpperCase()
              )}
            </button>
          ) : (
            <span className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          )
        ) : null}
        {isMessageSelectionMode && !isMine ? (
          <span
            className={`mb-1 grid h-6 w-6 shrink-0 place-items-center transition ${
              isSelected
                ? "text-[#f4f4f5]"
                : "text-transparent"
            }`}
          >
            <MessageCircleCheckIcon />
          </span>
        ) : null}
        {isPinned && isMine ? (
          <span className="mb-1 grid h-6 w-6 shrink-0 place-items-center text-[#f4f4f5]">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path d="M12 17v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 1z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </span>
        ) : null}
        <div
          className={`max-w-[min(84vw,92%)] rounded-xl sm:max-w-[72%] sm:rounded-xl ${
            hasStandaloneBubble
              ? "bg-transparent p-0 shadow-none"
              : hasFramedMedia
                ? "bg-transparent p-0 shadow-none"
              : `shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
                  hasAttachment ? "p-1.5" : "px-3 py-1.5 sm:px-3 sm:py-1.5"
                }`
          } ${
            hasStandaloneBubble || hasFramedMedia
              ? "text-[#f4f4f5]"
              : isMine
                ? `bg-[#f4f4f5] text-[#050505] ${
                  isPreviousSameAuthor ? "rounded-tr-lg" : ""
                } ${isNextSameAuthor ? "rounded-br-lg" : "rounded-br-md"}`
                : `bg-[#262626] text-[#f4f4f5] ${
                  isPreviousSameAuthor ? "rounded-tl-lg" : ""
                } ${isNextSameAuthor ? "rounded-bl-lg" : "rounded-bl-md"}`
          } ${isSelected ? "ring-2 ring-[#f4f4f5]/80" : ""}`}
          onContextMenu={(event) => {
            if (isFromPinnedList) event.stopPropagation();
            openMessageContextMenu(event, message);
          }}
        >
          {!hasStandaloneBubble && !isMine && !isPreviousSameAuthor ? (
            <p className={`${hasAttachment ? "mb-1.5 px-1" : "mb-0.5"} text-xs font-medium leading-4 opacity-55`}>
              {messageAuthor}
            </p>
          ) : null}
          {reply ? (
            <button
              className={`hush-reply-preview mb-2 block w-full rounded-xl border-l-4 px-3 py-2 text-left transition ${
                isMine
                  ? "border-[#050505]/45 bg-[#050505]/12 hover:bg-[#050505]/18"
                  : "border-[#f4f4f5]/45 bg-white/8 hover:bg-white/12"
              }`}
              onClick={(e) => {
                if (isFromPinnedList) {
                  e.stopPropagation();
                  setIsPinnedMessagesViewOpen(false);
                }
                scrollToReplyMessage(reply);
              }}
              type="button"
            >
              <p className="text-xs font-medium uppercase tracking-[0.12em] opacity-55">
                {reply.author}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs font-medium opacity-70">
                {reply.text}
              </p>
            </button>
          ) : null}
          {forwarded ? (
            <div className={`mb-1.5 flex items-center gap-2 px-0.5 text-left ${isMine && !hasStandaloneBubble && !hasFramedMedia ? "text-[#050505]" : "text-[#f4f4f5]"}`}>
              <button
                aria-label={forwardedName}
                className={`hush-avatar grid h-7 min-h-7 w-7 min-w-7 shrink-0 aspect-square place-items-center overflow-hidden rounded-full text-xs font-medium leading-normal transition disabled:cursor-default ${forwarded.authorUserId ? "cursor-pointer" : ""} ${isMine && !hasStandaloneBubble && !hasFramedMedia ? "bg-[#050505] text-[#f4f4f5]" : "bg-[#f4f4f5] text-[#050505]"}`}
                disabled={!forwarded.authorUserId}
                onClick={(e) => {
                  if (!forwarded.authorUserId) {
                    return;
                  }
                  if (isFromPinnedList) e.stopPropagation();
                  setViewedProfile({
                    avatarUrl: forwardedProfile?.avatar_url ?? null,
                    bio: forwardedProfile?.bio ?? null,
                    name: forwardedProfile?.display_name ?? forwardedName,
                    username: forwardedProfile?.username ?? null,
                    updatedAt: forwardedProfile?.updated_at ?? null,
                    userId: forwarded.authorUserId,
                  });
                }}
                type="button"
              >
                {forwardedProfile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={t("avatarAlt")}
                    className="h-full w-full object-cover"
                    src={forwardedProfile.avatar_url}
                  />
                ) : (
                  forwardedName[0]?.toUpperCase()
                )}
              </button>
              <div className="flex min-w-0 flex-col-reverse">
                <p className={`truncate text-xs font-medium leading-normal ${isMine && !hasStandaloneBubble && !hasFramedMedia ? "text-[#52525b]" : "text-[#a1a1aa]"}`}>
                  {language === "en" ? "Forwarded from" : "Переслано от"}
                </p>
                <p className="truncate text-sm font-medium leading-normal">
                  {forwardedName}
                </p>
              </div>
            </div>
          ) : null}
          {imageUrl ? (
            <button
              className="block w-full overflow-hidden rounded-lg sm:rounded-xl"
              onClick={(e) => {
                if (isFromPinnedList) e.stopPropagation();
                setSelectedImageUrl(imageUrl);
              }}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Отправленное изображение"
                className="max-h-[58dvh] w-full object-cover sm:max-h-[420px]"
                src={imageUrl}
                onLoad={() => onImageLoad?.(message.user_id)}
              />
            </button>
          ) : videoUrl ? (
            <video
              className="max-h-[58dvh] w-full rounded-lg bg-black sm:max-h-[420px] sm:rounded-xl"
              controls
              controlsList="nodownload"
              preload="metadata"
              src={videoUrl}
              onClick={(e) => {
                if (isFromPinnedList) e.stopPropagation();
              }}
            />
          ) : audioUrl ? (
            <VoiceMessage
              editedAt={message.edited_at ?? null}
              isMine={isMine}
              isUnplayed={
                message.id > 0 &&
                !playedVoiceMessageIds.has(message.id)
              }
              onPlaybackStart={() => markVoiceMessagePlayed(message)}
              receiptStatus={receiptStatus}
              sentAt={message.created_at}
              src={audioUrl}
            />
          ) : filePayload ? (
            <FileAttachment
              editedAt={message.edited_at ?? null}
              file={filePayload}
              isMine={isMine}
              receiptStatus={receiptStatus}
              sentAt={message.created_at}
            />
          ) : callDurationSeconds !== null ? (
            <div
              className={`min-w-[min(230px,70vw)] rounded-xl px-3 py-2 sm:min-w-[min(260px,70vw)] sm:rounded-xl ${
                isMine ? "bg-[#2f2f2f]" : "bg-[#262626]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#050505]"
                >
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium opacity-75">
                    {t("call")}
                  </p>
                  <p className="text-xs font-medium opacity-60">
                    {t("callConversation")} {formatCallDuration(callDurationSeconds)}
                  </p>
                </div>
              </div>
            </div>
          ) : sticker ? (
            <div className="hush-sticker-message px-1 py-0.5">
              <span className="block text-6xl leading-normal drop-shadow-[0_10px_20px_rgba(0,0,0,0.25)] sm:text-7xl">
                {sticker}
              </span>
              <span className="mt-1 flex items-center justify-end gap-1 text-xs font-medium text-[#a1a1aa]">
                {message.edited_at ? (
                  <span>{t("edited")}</span>
                ) : null}
                {formatMessageTime(message.created_at)}
                {receiptStatus ? (
                  <MessageReceiptIcon className="h-4 w-4" status={receiptStatus} />
                ) : null}
              </span>
            </div>
          ) : (
            <p
              className="whitespace-pre-wrap break-words text-sm leading-5"
            >
              {displayText}
              <span className="ml-2 inline-flex translate-y-[1px] items-center gap-1 align-baseline">
                <span
                  className={`text-xs font-medium leading-normal ${
                    isMine ? "text-[#404040]" : "text-[#71717a]"
                  }`}
                >
                  {message.edited_at ? `${t("edited")} ` : ""}
                  {formatMessageTime(message.created_at)}
                </span>
                {receiptStatus ? (
                  <span
                    aria-label={
                      receiptStatus === "read" ? "Прочитано" : "Доставлено"
                    }
                    className="inline-flex items-center text-[#262626]"
                  >
                    {receiptStatus === "read" ? (
                      <MessageReceiptIcon className="h-4 w-4" status="read" />
                    ) : (
                      <MessageReceiptIcon className="h-4 w-4" status="delivered" />
                    )}
                  </span>
                ) : null}
              </span>
            </p>
          )}
          {hasCaptionableAttachment && attachmentCaption ? (
            <p className="mt-1.5 max-w-[min(320px,70vw)] whitespace-pre-wrap break-words px-1 text-sm leading-5 text-[#f4f4f5]">
              {attachmentCaption}
            </p>
          ) : null}
          {!hasStandaloneBubble && hasAttachment ? (
            <div className={`${hasAttachment ? "mt-2 px-1" : "mt-1"} flex items-center justify-end gap-3`}>
              <p
                className={`text-right text-xs font-medium ${
                  hasFramedMedia
                    ? "text-[#a1a1aa]"
                    : isMine ? "text-[#404040]" : "text-[#71717a]"
                }`}
              >
                {message.edited_at ? (
                  <span>{t("edited")} </span>
                ) : null}
                {formatMessageTime(message.created_at)}
              </p>
              {receiptStatus ? (
                <span
                  aria-label={
                    receiptStatus === "read" ? "Прочитано" : "Доставлено"
                  }
                  className={`inline-flex items-center ${hasFramedMedia ? "text-[#a1a1aa]" : "text-[#262626]"}`}
                >
                  {receiptStatus === "read" ? (
                    <MessageReceiptIcon className="h-4 w-4" status="read" />
                  ) : (
                    <MessageReceiptIcon className="h-4 w-4" status="delivered" />
                  )}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {isPinned && !isMine ? (
          <span className="mb-1 grid h-6 w-6 shrink-0 place-items-center text-[#f4f4f5]">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path d="M12 17v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 1z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </span>
        ) : null}
        {isMine ? (
          shouldShowOwnAvatar ? (
            <button
              className="hush-avatar grid h-7 w-7 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-xs font-medium text-[#050505] transition sm:h-8 sm:w-8 sm:text-xs"
              onClick={(e) => {
                if (isFromPinnedList) e.stopPropagation();
                setViewedProfile({
                  avatarUrl: currentProfile?.avatar_url ?? null,
                  bio: currentProfile?.bio ?? null,
                  name: activeUserName,
                  username: currentProfile?.username ?? null,
                  updatedAt: currentProfile?.updated_at ?? null,
                  userId: user.id,
                });
              }}
              type="button"
            >
              {currentProfile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Твоя аватарка"
                  className="h-full w-full object-cover"
                  src={currentProfile.avatar_url}
                />
              ) : (
                activeUserName[0]?.toUpperCase()
              )}
            </button>
          ) : (
            <span className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          )
        ) : null}
      </article>
    );
  },
  (prev, next) => {
    if (
      prev.message !== next.message ||
      prev.messageIndex !== next.messageIndex ||
      prev.isFromPinnedList !== next.isFromPinnedList
    ) {
      return false;
    }

    const prevSelected = prev.selectedMessageIdSet.has(prev.message.id);
    const nextSelected = next.selectedMessageIdSet.has(next.message.id);
    if (prevSelected !== nextSelected) return false;

    const prevPinned = prev.activePinnedMessageIdSet.has(prev.message.id);
    const nextPinned = next.activePinnedMessageIdSet.has(next.message.id);
    if (prevPinned !== nextPinned) return false;

    const prevReceipt = prev.message.user_id === prev.user.id && prev.message.id > 0
      ? prev.messageReceiptStatuses.get(prev.message.id) ?? "delivered"
      : null;
    const nextReceipt = next.message.user_id === next.user.id && next.message.id > 0
      ? next.messageReceiptStatuses.get(next.message.id) ?? "delivered"
      : null;
    if (prevReceipt !== nextReceipt) return false;

    const prevHighlighted = prev.highlightedMessageId === prev.message.id;
    const nextHighlighted = next.highlightedMessageId === next.message.id;
    if (prevHighlighted !== nextHighlighted) return false;

    if (prev.isMessageSelectionMode !== next.isMessageSelectionMode) return false;

    const prevVoicePlayed = prev.playedVoiceMessageIds.has(prev.message.id);
    const nextVoicePlayed = next.playedVoiceMessageIds.has(next.message.id);
    if (prevVoicePlayed !== nextVoicePlayed) return false;

    if (prev.language !== next.language) return false;

    const prevProfile = prev.message.user_id ? prev.profilesByUserId.get(prev.message.user_id) : null;
    const nextProfile = next.message.user_id ? next.profilesByUserId.get(next.message.user_id) : null;
    if (prevProfile?.updated_at !== nextProfile?.updated_at) return false;

    if (prev.currentProfile?.updated_at !== next.currentProfile?.updated_at) return false;
    if (prev.currentProfile?.avatar_url !== next.currentProfile?.avatar_url) return false;

    const prevPrevAuthor = prev.messagesArray[prev.messageIndex - 1]?.user_id;
    const nextPrevAuthor = next.messagesArray[next.messageIndex - 1]?.user_id;
    if (prevPrevAuthor !== nextPrevAuthor) return false;

    const prevNextAuthor = prev.messagesArray[prev.messageIndex + 1]?.user_id;
    const nextNextAuthor = next.messagesArray[next.messageIndex + 1]?.user_id;
    if (prevNextAuthor !== nextNextAuthor) return false;

    return true;
  }
);

function MessageCircleCheckIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

type MessageViewportProps = {
  activePinnedMessageIdSet: Set<number>;
  activeUserName: string;
  currentProfile: ProfileRow | null;
  handleMessageSelectionClick: (event: MouseEvent<HTMLElement>, message: MessageRow) => void;
  highlightMessage?: (messageId: number) => boolean;
  highlightedMessageId: number | null;
  isMessageSelectionMode: boolean;
  setIsPinnedMessagesViewOpen: Dispatch<SetStateAction<boolean>>;
  language: string;
  markVoiceMessagePlayed: (message: MessageRow) => void;
  messageReceiptStatuses: Map<number, "delivered" | "read">;
  visibleDialogMessages: MessageRow[];
  openMessageContextMenu: (event: MouseEvent<HTMLElement>, message: MessageRow) => void;
  playedVoiceMessageIds: Set<number>;
  profilesByUserId: Map<string, ProfileRow>;
  scrollToReplyMessage: (reply: ReplyMessagePayload) => void;
  selectedMessageIdSet: Set<number>;
  setSelectedImageUrl: (url: string | null) => void;
  setViewedProfile: (profile: ViewedProfileState | null) => void;
  t: (key: any) => string;
  user: User;
  isLoadingMessages: boolean;
  visibleDialogMessagesCount: number;
  messagesListRef: RefObject<HTMLDivElement | null>;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  messagesBottomAnchorRef: RefObject<HTMLDivElement | null>;
  scrollbarTrackRef: RefObject<HTMLDivElement | null>;
  scrollbarThumbRef: RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
  scrollButtonRef: RefObject<HTMLButtonElement | null>;
  onImageLoad: (messageUserId: string | null) => void;
};

const MessageViewport = memo(
  function MessageViewport({
    activePinnedMessageIdSet,
    activeUserName,
    currentProfile,
    handleMessageSelectionClick,
    highlightMessage,
    highlightedMessageId,
    isMessageSelectionMode,
    setIsPinnedMessagesViewOpen,
    language,
    markVoiceMessagePlayed,
    messageReceiptStatuses,
    visibleDialogMessages,
    openMessageContextMenu,
    playedVoiceMessageIds,
    profilesByUserId,
    scrollToReplyMessage,
    selectedMessageIdSet,
    setSelectedImageUrl,
    setViewedProfile,
    t,
    user,
    isLoadingMessages,
    visibleDialogMessagesCount,
    messagesListRef,
    handleScroll,
    messagesBottomAnchorRef,
    scrollbarTrackRef,
    scrollbarThumbRef,
    scrollToBottom,
    scrollButtonRef,
    onImageLoad,
  }: MessageViewportProps) {
    return (
      <>
        {/* Main Message List Viewport Wrapper */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            className="hush-messages-viewport scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-transparent p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-2xl sm:p-4 w-full h-full"
            ref={messagesListRef}
            onScroll={handleScroll}
          >
            {isLoadingMessages && visibleDialogMessagesCount === 0 ? (
              <p className="text-sm text-[#a1a1aa]">
                {language === "en" ? "Loading messages..." : "Загружаю сообщения..."}
              </p>
            ) : null}

            {!isLoadingMessages && visibleDialogMessagesCount === 0 ? (
              <p className="text-sm text-[#a1a1aa]">
                {language === "en"
                  ? "No messages yet. Write the first one."
                  : "Сообщений пока нет. Напиши первое."}
              </p>
            ) : null}

            {visibleDialogMessages.map((message, messageIndex) => (
              <MessageItem
                activePinnedMessageIdSet={activePinnedMessageIdSet}
                activeUserName={activeUserName}
                currentProfile={currentProfile}
                handleMessageSelectionClick={handleMessageSelectionClick}
                highlightMessage={highlightMessage}
                highlightedMessageId={highlightedMessageId}
                isFromPinnedList={false}
                isMessageSelectionMode={isMessageSelectionMode}
                setIsPinnedMessagesViewOpen={setIsPinnedMessagesViewOpen}
                key={message.client_key ?? message.id}
                language={language}
                markVoiceMessagePlayed={markVoiceMessagePlayed}
                message={message}
                messageIndex={messageIndex}
                messageReceiptStatuses={messageReceiptStatuses}
                messagesArray={visibleDialogMessages}
                openMessageContextMenu={openMessageContextMenu}
                playedVoiceMessageIds={playedVoiceMessageIds}
                profilesByUserId={profilesByUserId}
                scrollToReplyMessage={scrollToReplyMessage}
                selectedMessageIdSet={selectedMessageIdSet}
                setSelectedImageUrl={setSelectedImageUrl}
                setViewedProfile={setViewedProfile}
                t={t}
                user={user}
                onImageLoad={onImageLoad}
              />
            ))}

            <div
              aria-hidden="true"
              className="h-px shrink-0"
              ref={messagesBottomAnchorRef}
            />
          </div>

          {/* Custom Scrollbar Track */}
          <div
            className="absolute right-[4px] top-[6px] bottom-[6px] w-[6px] rounded-full bg-white/[0.03] hover:bg-white/[0.08] opacity-0 transition-[opacity,background-color] duration-200 pointer-events-none z-20 cursor-pointer"
            ref={scrollbarTrackRef}
          >
            {/* Custom Scrollbar Thumb */}
            <div
              className="w-full rounded-full bg-white/32 hover:bg-white/45 transition-[background-color] duration-150 cursor-grab active:cursor-grabbing"
              ref={scrollbarThumbRef}
              style={{ height: "0px", transform: "translateY(0px)" }}
            />
          </div>
        </div>

        <button
          className="hush-scroll-bottom-btn z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#3f3f46]/35 bg-[#18181c]/75 text-[#f4f4f5] shadow-[0_4px_12px_rgba(0,0,0,0.4)] opacity-0 pointer-events-none hover:bg-[#f4f4f5] hover:text-[#050505]"
          onClick={scrollToBottom}
          ref={scrollButtonRef}
          type="button"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </svg>
        </button>
      </>
    );
  }
);
