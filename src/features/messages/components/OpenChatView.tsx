import { useState } from "react";
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
import { VoiceMessage } from "@/features/messages/components/VoiceMessage";
import { formatAudioTime, formatCallDuration, formatMessageTime } from "@/shared/utils/format";
import { formatLastSeen, isProfileOnline } from "@/shared/utils/profile";
import {
  getMessageAudioUrl,
  getMessageCallDuration,
  getMessageFilePayload,
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
  messageReceiptStatuses: Map<number, "delivered" | "read">;
  messageText: string;
  messagesListRef: RefObject<HTMLDivElement | null>;
  openMessageContextMenu: (event: MouseEvent<HTMLElement>, message: MessageRow) => void;
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
  user: User;
  visibleDialogMessages: MessageRow[];
  visibleDialogMessagesCount: number;
  voiceInputLevel: number;
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
  messageReceiptStatuses,
  messageText,
  messagesListRef,
  openMessageContextMenu,
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
  user,
  visibleDialogMessages,
  visibleDialogMessagesCount,
  voiceInputLevel,
  voiceRecordingDuration,
}: OpenChatViewProps) {
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
                        Перенесите файл сюда
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
                        Фото, видео и документы отправятся в этот чат.
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="mb-2 flex h-[60px] min-h-[60px] items-center justify-between gap-2 overflow-hidden rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                    <button
                      aria-label="Назад к чатам"
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
                    <button
                      className="relative h-9 w-9 shrink-0 rounded-full transition hover:scale-105 sm:h-10 sm:w-10"
                      onClick={() => {
                        setViewedProfile(
                          friendProfile ?? {
                            avatarUrl: null,
                            name: "Друг",
                            username: null,
                            updatedAt: null,
                            userId: null,
                          },
                        );
                      }}
                      type="button"
                    >
                      <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-sm font-medium text-[#050505] sm:text-sm">
                        {friendProfile?.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt="Аватар собеседника"
                            className="h-full w-full object-cover"
                            src={friendProfile.avatarUrl}
                          />
                        ) : (
                          (friendProfile?.name ?? "Друг")[0]?.toUpperCase()
                        )}
                      </span>
                      {isProfileOnline(friendProfile?.updatedAt ?? null) ? (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111111] bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)] sm:h-3.5 sm:w-3.5" />
                      ) : null}
                    </button>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-medium sm:text-base">
                        {friendProfile?.name ?? "Друг"}
                      </h2>
                      <p className="truncate text-xs text-[#a1a1aa] sm:text-sm">
                        {isFriendTyping ? "\u043f\u0435\u0447\u0430\u0442\u0430\u0435\u0442..." : formatLastSeen(friendProfile?.updatedAt ?? null)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <button
                      aria-label="Удалить переписку"
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
                      aria-label={callStatus === "idle" ? "Позвонить" : callStatusText}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 text-[#f4f4f5] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:border-[#3f3f46]/25 disabled:text-[#71717a] sm:rounded-xl"
                      disabled={!friendProfile?.userId || callStatus !== "idle"}
                      onClick={() => startCall()}
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
                {isMessageSelectionMode ? (
                  <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/88 px-3 py-2 text-[#f4f4f5] shadow-[0_12px_35px_rgba(0,0,0,0.25)] backdrop-blur-md sm:mb-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#d4d4d8]">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#050505]">
                        {selectedDialogMessages.length}
                      </span>
                      <span className="truncate">
                        Выделено сообщений
                      </span>
                    </div>
                    <div className="flex flex-1 justify-end gap-2 sm:flex-none">
                      <button
                        className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#3f3f46]/55 bg-[#f4f4f5]/10 px-3 text-sm font-medium text-[#f4f4f5] transition hover:bg-[#f4f4f5]/16 sm:flex-none"
                        onClick={forwardSelectedMessages}
                        type="button"
                      >
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <path d="m14 6 6 6-6 6M20 12H9a5 5 0 0 0-5 5v1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                        Переслать
                      </button>
                      <button
                        className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-red-400/45 bg-red-500/16 px-3 text-sm font-medium text-red-100 transition hover:bg-red-500/25 sm:flex-none"
                        onClick={() => setIsSelectedDeleteDialogOpen(true)}
                        type="button"
                      >
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                        Удалить
                      </button>
                    </div>
                  </div>
                ) : null}
                {activePinnedMessages.length > 0 ? (
                  <div className="mb-2 flex min-h-9 shrink-0 overflow-hidden rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 text-sm text-[#e5e5e5] shadow-[0_10px_30px_rgba(0,0,0,0.18)] sm:mb-3">
                    <button
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left transition hover:bg-white/[0.08]"
                      onClick={scrollToNextPinnedMessage}
                      type="button"
                    >
                      <span className="shrink-0 font-medium text-[#f4f4f5]">
                        Закрепы: {activePinnedMessages.length}
                      </span>
                      <span className="min-w-0 truncate text-[#a1a1aa]">
                        {getReadableMessageText(activePinnedMessages.at(-1)?.text ?? "")}
                      </span>
                    </button>
                    <button
                      aria-label="Открыть все закрепы"
                      className={`grid w-14 shrink-0 place-items-center border-l border-[#3f3f46]/35 transition ${
                        isPinnedMessagesViewOpen
                          ? "bg-[#f4f4f5]/14 text-[#f4f4f5]"
                          : "bg-white/[0.03] text-[#d4d4d8] hover:bg-white/[0.08] hover:text-[#f4f4f5]"
                      }`}
                      onClick={() => setIsPinnedMessagesViewOpen((isOpen) => !isOpen)}
                      type="button"
                    >
                      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 28 24">
                        <path d="m9.2 4.4 4 4-2.4.9-3.7 3.7.4 2.8-5.2-5.2 2.8.4 3.7-3.7.4-2.9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                        <path d="M16 7.5h8M16 12h8M16 16.5h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                      </svg>
                    </button>
                  </div>
                ) : null}

                <div
                  className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#050505]/82 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] [overflow-anchor:none] backdrop-blur-md sm:rounded-2xl sm:p-4"
                  ref={messagesListRef}
                >
                  {isLoadingMessages && visibleDialogMessagesCount === 0 ? (
                    <p className="text-sm text-[#a1a1aa]">Загружаю сообщения...</p>
                  ) : null}

                  {!isLoadingMessages && visibleDialogMessagesCount === 0 ? (
                    <p className="text-sm text-[#a1a1aa]">
                      {isPinnedMessagesViewOpen
                        ? "Закрепов пока нет."
                        : "Сообщений пока нет. Напиши первое."}
                    </p>
                  ) : null}

                  {visibleDialogMessages.map((message, messageIndex) => {
                    const isMine = message.user_id === user.id;
                    const previousMessage = visibleDialogMessages[messageIndex - 1];
                    const nextMessage = visibleDialogMessages[messageIndex + 1];
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
                    const displayText = reply?.body ?? message.text;
                    const imageUrl = getMessageImageUrl(displayText);
                    const videoUrl = getMessageVideoUrl(displayText);
                    const audioUrl = getMessageAudioUrl(displayText);
                    const filePayload = getMessageFilePayload(displayText);
                    const callDurationSeconds = getMessageCallDuration(displayText);
                    const sticker = getMessageSticker(displayText);
                    const hasFramedMedia = Boolean(imageUrl || videoUrl || filePayload);
                    const hasAttachment = Boolean(
                      imageUrl || videoUrl || audioUrl || filePayload || callDurationSeconds !== null || sticker,
                    );
                    const hasStandaloneBubble = Boolean(
                      audioUrl || filePayload || callDurationSeconds !== null || sticker,
                    );

                    return (
                      <article
                        className={`-mx-1 flex items-end gap-1.5 rounded-xl px-1 py-1 transition-[background-color,box-shadow] duration-300 sm:gap-2 sm:rounded-2xl ${
                          highlightedMessageId === message.id
                            ? "bg-[#f4f4f5]/12 shadow-[0_0_0_2px_rgba(244,244,245,0.26),0_0_38px_rgba(244,244,245,0.12)]"
                            : isSelected
                              ? "bg-[#f4f4f5]/8 shadow-[0_0_0_1px_rgba(244,244,245,0.12)]"
                              : "shadow-[0_0_0_0_rgba(244,244,245,0)]"
                        } ${
                          isPreviousSameAuthor ? "mt-1" : "mt-3"
                        } ${isMine ? "justify-end" : "justify-start"}`}
                        data-message-id={message.id}
                        key={message.id}
                        onClickCapture={(event) => handleMessageSelectionClick(event, message)}
                      >
                        {isMessageSelectionMode && isMine ? (
                          <span
                            className={`mb-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                              isSelected
                                ? "border-[#f4f4f5] bg-[#f4f4f5] text-[#050505]"
                                : "border-[#3f3f46]/70 bg-[#111111]/88 text-transparent"
                            }`}
                          >
                            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
                              <path d="m3.5 8.2 2.8 2.8 6.2-6.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                          </span>
                        ) : null}
                        {!isMine ? (
                          shouldShowFriendAvatar ? (
                            <button
                              className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-xs font-medium text-[#050505] transition hover:scale-105 sm:h-8 sm:w-8 sm:text-xs"
                              onClick={() =>
                                setViewedProfile({
                                  avatarUrl: messageProfile?.avatar_url ?? null,
                                  name: messageAuthor,
                                  username: messageProfile?.username ?? null,
                                  updatedAt: messageProfile?.updated_at ?? null,
                                  userId: message.user_id,
                                })
                              }
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
                            className={`mb-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                              isSelected
                                ? "border-[#f4f4f5] bg-[#f4f4f5] text-[#050505]"
                                : "border-[#3f3f46]/70 bg-[#111111]/88 text-transparent"
                            }`}
                          >
                            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
                              <path d="m3.5 8.2 2.8 2.8 6.2-6.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                          </span>
                        ) : null}
                        {isPinned && isMine ? (
                          <span className="mb-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/55 bg-[#111111]/94 text-[#f4f4f5] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20">
                              <path d="m12.8 2.6 4.6 4.6-3 .9-4.5 4.5.5 3.5-6.5-6.5 3.5.5 4.5-4.5.9-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                              <path d="m8.8 12.4-3.6 3.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                            </svg>
                          </span>
                        ) : null}
                        <div
                          className={`max-w-[min(84vw,92%)] rounded-[18px] sm:max-w-[72%] sm:rounded-[20px] ${
                            hasStandaloneBubble
                              ? "bg-transparent p-0 shadow-none"
                              : hasFramedMedia
                                ? "bg-transparent p-0 shadow-none"
                              : `shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
                                  hasAttachment ? "p-1.5 sm:p-2" : "px-3 py-2 sm:px-3.5 sm:py-2.5"
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
                          onContextMenu={(event) => openMessageContextMenu(event, message)}
                        >
                          {!hasStandaloneBubble && !isMine && !isPreviousSameAuthor ? (
                            <p className={`${hasAttachment ? "mb-1.5 px-1" : "mb-0.5"} text-xs font-medium leading-4 opacity-55`}>
                              {messageAuthor}
                            </p>
                          ) : null}
                          {reply ? (
                            <button
                              className={`hush-reply-preview mb-2 block w-full rounded-xl border-l-4 px-3 py-2 text-left transition hover:scale-[1.01] ${
                                isMine
                                  ? "border-[#050505]/45 bg-[#050505]/12 hover:bg-[#050505]/18"
                                  : "border-[#f4f4f5]/45 bg-white/8 hover:bg-white/12"
                              }`}
                              onClick={() => scrollToReplyMessage(reply)}
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
                          {imageUrl ? (
                            <button
                              className="block w-full overflow-hidden rounded-lg sm:rounded-xl"
                              onClick={() => setSelectedImageUrl(imageUrl)}
                              type="button"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt="Отправленное изображение"
                                className="max-h-[58dvh] w-full object-cover sm:max-h-[420px]"
                                src={imageUrl}
                              />
                            </button>
                        ) : videoUrl ? (
                          <video
                            className="max-h-[58dvh] w-full rounded-lg bg-black sm:max-h-[420px] sm:rounded-xl"
                            controls
                            controlsList="nodownload"
                            preload="metadata"
                            src={videoUrl}
                          />
                        ) : audioUrl ? (
                          <VoiceMessage
                            isMine={isMine}
                            sentAt={message.created_at}
                            src={audioUrl}
                          />
                        ) : filePayload ? (
                          <FileAttachment file={filePayload} isMine={isMine} />
                        ) : callDurationSeconds !== null ? (
                          <div
                            className={`min-w-[min(230px,70vw)] rounded-xl px-3 py-2 sm:min-w-[min(260px,70vw)] sm:rounded-2xl ${
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
                                  Звонок
                                </p>
                                <p className="text-xs font-medium opacity-60">
                                  Разговор {formatCallDuration(callDurationSeconds)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : sticker ? (
                          <div className="px-1 py-0.5">
                            <span className="block text-6xl leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.25)] sm:text-7xl">
                              {sticker}
                            </span>
                          </div>
                        ) : (
                            <p
                              className="whitespace-pre-wrap break-words text-sm leading-6 sm:text-base"
                            >
                              {displayText}
                              <span className="ml-2 inline-flex translate-y-[1px] items-center gap-1 align-baseline">
                                <span
                                  className={`text-xs font-medium leading-none ${
                                    isMine ? "text-[#404040]" : "text-[#71717a]"
                                  }`}
                                >
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
                                      <svg
                                        aria-hidden="true"
                                        className="h-3.5 w-6"
                                        fill="none"
                                        viewBox="0 0 24 16"
                                      >
                                        <path
                                          d="m3 8 3 3 7-7M11 11l8-8"
                                          stroke="currentColor"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        aria-hidden="true"
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        viewBox="0 0 16 16"
                                      >
                                        <path
                                          d="m3 8 3 3 7-7"
                                          stroke="currentColor"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                        />
                                      </svg>
                                    )}
                                  </span>
                                ) : null}
                              </span>
                            </p>
                          )}
                          {!hasStandaloneBubble && hasAttachment ? (
                          <div className={`${hasAttachment ? "mt-2 px-1" : "mt-1"} flex items-center justify-end gap-3`}>
                            <p
                              className={`text-right text-xs font-medium ${
                                hasFramedMedia
                                  ? "text-[#a1a1aa]"
                                  : isMine ? "text-[#404040]" : "text-[#71717a]"
                              }`}
                            >
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
                                  <svg
                                    aria-hidden="true"
                                    className="h-3.5 w-6"
                                    fill="none"
                                    viewBox="0 0 24 16"
                                  >
                                    <path
                                      d="m3 8 3 3 7-7M11 11l8-8"
                                      stroke="currentColor"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 16 16"
                                  >
                                    <path
                                      d="m3 8 3 3 7-7"
                                      stroke="currentColor"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                    />
                                  </svg>
                                )}
                              </span>
                            ) : null}
                          </div>
                          ) : null}
                        </div>
                        {isPinned && !isMine ? (
                          <span className="mb-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/55 bg-[#111111]/94 text-[#f4f4f5] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20">
                              <path d="m12.8 2.6 4.6 4.6-3 .9-4.5 4.5.5 3.5-6.5-6.5 3.5.5 4.5-4.5.9-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                              <path d="m8.8 12.4-3.6 3.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                            </svg>
                          </span>
                        ) : null}
                        {isMine ? (
                          shouldShowOwnAvatar ? (
                            <button
                              className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-xs font-medium text-[#050505] transition hover:scale-105 sm:h-8 sm:w-8 sm:text-xs"
                              onClick={() =>
                                setViewedProfile({
                                  avatarUrl: currentProfile?.avatar_url ?? null,
                                  name: activeUserName,
                                  username: currentProfile?.username ?? null,
                                  updatedAt: currentProfile?.updated_at ?? null,
                                  userId: user.id,
                                })
                              }
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
                  })}
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
                    aria-label="Прикрепить файл"
                    className="grid min-h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/12 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/18 disabled:cursor-not-allowed disabled:opacity-50"
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
                        />
                      </svg>
                    )}
                  </button>
                  {isRecordingVoice ? (
                    <div className="relative col-span-3 flex min-h-10 min-w-0 flex-1 items-center rounded-lg border border-red-400/35 bg-red-500/10 px-3 text-sm text-[#f4f4f5] sm:col-span-1">
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
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        aria-label="Текст сообщения"
                        className="min-h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm text-[#f4f4f5] outline-none transition placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] focus:bg-[#f4f4f5]/18 sm:px-4 sm:text-sm"
                        disabled={isSelectedChatBlocked}
                        onChange={handleMessageTextChange}
                        placeholder={
                          isSelectedChatBlockedByMe
                            ? "Пользователь заблокирован"
                            : isSelectedChatBlockingMe
                              ? "Вы были заблокированы"
                            : editingMessage
                            ? "Измени сообщение..."
                            : replyTarget
                              ? "Ответь на сообщение..."
                              : "Напиши сообщение..."
                        }
                        ref={messageInputRef}
                        type="text"
                        value={messageText}
                      />
                      <button
                        aria-label="Стикеры"
                        className="grid min-h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/12 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/18 disabled:cursor-not-allowed disabled:opacity-50"
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
                    aria-label={isRecordingVoice ? "Отправить голосовое" : "Записать голосовое"}
                    className={`relative grid min-h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border text-[#f4f4f5] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isRecordingVoice
                        ? "border-red-400/60 bg-red-500/85 text-white hover:bg-red-400"
                        : "border-[#3f3f46]/35 bg-[#f4f4f5]/12 hover:bg-[#f4f4f5]/18"
                    }`}
                    disabled={isUploadingAttachment || isSelectedChatBlocked}
                    onClick={toggleVoiceRecording}
                    style={
                      isRecordingVoice
                        ? {
                            boxShadow: `0 0 ${16 + voiceInputLevel * 46}px rgba(248,113,113,${0.34 + voiceInputLevel * 0.58})`,
                            transform: `scale(${1 + voiceInputLevel * 0.14})`,
                          }
                        : undefined
                    }
                    type="button"
                  >
                    {isRecordingVoice ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-lg border border-white/40 transition duration-75"
                          style={{
                            opacity: 0.22 + voiceInputLevel * 0.58,
                            transform: `scale(${0.82 + voiceInputLevel * 0.34})`,
                          }}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute inset-1 rounded-md bg-white/18 transition-transform duration-75"
                          style={{
                            transform: `scale(${0.42 + voiceInputLevel * 0.72})`,
                            opacity: 0.24 + voiceInputLevel * 0.58,
                          }}
                        />
                        <svg
                          aria-hidden="true"
                          className="relative h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M5 12 19 4l-3.8 16-3.6-6.1L5 12Z" />
                        </svg>
                      </>
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
                ) : null}

                {isPinnedMessagesViewOpen && activePinnedMessages.length > 0 ? (
                  <button
                    className="mt-2 min-h-11 w-full rounded-xl border border-red-400/25 bg-red-500/10 px-4 text-sm font-medium text-red-100 shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition hover:border-red-300/40 hover:bg-red-500/16 sm:rounded-2xl"
                    onClick={() => setIsUnpinAllDialogOpen(true)}
                    type="button"
                  >
                    Открепить {activePinnedMessages.length} сообщений
                  </button>
                ) : null}

                {!isPinnedMessagesViewOpen && (replyTarget || editingMessage) ? (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#3f3f46]/35 bg-[#111111]/82 px-3 py-2.5 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-md sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#e5e5e5]">
                        {editingMessage ? "Редактирование" : "Ответ"}
                      </p>
                      <p className="mt-1 truncate font-medium text-[#f4f4f5]">
                        {getReadableMessageText((editingMessage ?? replyTarget)?.text ?? "")}
                      </p>
                    </div>
                    <button
                      className="shrink-0 rounded-xl border border-[#3f3f46]/35 px-3 py-2 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10"
                      onClick={() => {
                        setReplyTarget(null);
                        setEditingMessage(null);
                        setMessageText("");
                      }}
                      type="button"
                    >
                      Отмена
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
