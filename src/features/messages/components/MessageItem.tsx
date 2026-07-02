import { memo } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfiles } from "@/features/profile/ProfilesContext";
import { useChat } from "@/features/messages/contexts/ChatContext";
import { useApp } from "@/shared/context/AppContext";
import { useI18n } from "@/shared/i18n-context";
import type { MessageRow } from "@/shared/types";
import { FileAttachment } from "@/features/messages/components/FileAttachment";
import { MessageReceiptIcon } from "@/features/messages/components/MessageReceiptIcon";
import { VoiceMessage } from "@/features/messages/components/VoiceMessage";
import { formatCallDuration, formatMessageTime } from "@/shared/utils/format";
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

type MessageItemProps = {
  message: MessageRow;
  messageIndex: number;
  messagesArray: MessageRow[];
  isFromPinnedList?: boolean;
};

export const MessageItem = memo(
  function MessageItem({
    message,
    messageIndex,
    messagesArray,
    isFromPinnedList = false,
  }: MessageItemProps) {
    const { user } = useAuth();
    const { profilesByUserId, currentProfile, activeUserName } = useProfiles();
    const {
      selectedMessageIdSet,
      activePinnedMessageIdSet,
      messageReceiptStatuses,
      isMessageSelectionMode,
      playedVoiceMessageIds,
      highlightedMessageId,
      setIsPinnedMessagesViewOpen,
      handleMessageSelectionClick,
      openMessageContextMenu,
      markVoiceMessagePlayed,
      scrollToReplyMessage,
      highlightMessage,
      messagesListRef,
    } = useChat();

    const { setSelectedImageUrl, setViewedProfile } = useApp();
    const { language, t } = useI18n();

    if (!user) return null;

    const isMine = message.user_id === user.id;
    const previousMessage = messagesArray[messageIndex - 1];
    const nextMessage = messagesArray[messageIndex + 1];
    const isPreviousSameAuthor = previousMessage?.user_id === message.user_id;
    const isNextSameAuthor = nextMessage?.user_id === message.user_id;
    const isSelected = selectedMessageIdSet.has(message.id);
    const isPinned = activePinnedMessageIdSet.has(message.id);
    const receiptStatus =
      isMine && message.id > 0
        ? messageReceiptStatuses.get(message.id) ?? "delivered"
        : isMine && message.id < 0
          ? "delivered"
          : null;
    const messageProfile = message.user_id ? profilesByUserId.get(message.user_id) : null;
    const messageAuthor = messageProfile?.display_name ?? message.author;
    const shouldShowFriendAvatar = !isMine;
    const shouldShowOwnAvatar = isMine && !isNextSameAuthor;
    const reply = getMessageReply(message.text);
    const rawDisplayText = reply?.body ?? message.text;
    const forwarded = getMessageForward(rawDisplayText);
    const forwardedProfile = forwarded?.authorUserId
      ? forwarded.authorUserId === user.id
        ? currentProfile
        : profilesByUserId.get(forwarded.authorUserId)
      : null;
    const forwardedName = forwardedProfile?.display_name ?? forwarded?.authorName ?? "";
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

    const handleImageLoad = () => {
      const messagesList = messagesListRef.current;
      if (!messagesList || !isMine) return;

        requestAnimationFrame(() => {
          messagesList.scrollTop = messagesList.scrollHeight;
        });
    };

    return (
      <article
        className={`hush-message-row -mx-1 flex items-end gap-1.5 rounded-xl px-1 py-1 transition-[background-color,box-shadow] duration-300 sm:gap-2 sm:rounded-2xl ${
          isFromPinnedList ? "cursor-pointer hover:bg-white/[0.03]" : ""
        } ${
          highlightedMessageId === message.id
            ? "bg-[#f4f4f5]/12 shadow-[0_0_0_2px_rgba(244,244,245,0.26),0_0_38px_rgba(244,244,245,0.12)]"
            : isSelected
              ? "bg-[#f4f4f5]/8 shadow-[0_0_0_1px_rgba(244,244,245,0.12)]"
              : "shadow-[0_0_0_0_rgba(244,244,245,0)]"
        } ${isPreviousSameAuthor ? "mt-1" : "mt-3"} ${isMine ? "justify-end" : "justify-start"}`}
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
              isSelected ? "text-[#f4f4f5]" : "text-transparent"
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
                  userId: message.user_id || "",
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
          ) : null
        ) : null}
        {isMessageSelectionMode && !isMine ? (
          <span
            className={`mb-1 grid h-6 w-6 shrink-0 place-items-center transition ${
              isSelected ? "text-[#f4f4f5]" : "text-transparent"
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
                ? `bg-[#f4f4f5] text-[#050505] ${isPreviousSameAuthor ? "rounded-tr-lg" : ""} ${isNextSameAuthor ? "rounded-br-lg" : "rounded-br-md"}`
                : `bg-[#262626] text-[#f4f4f5] ${isPreviousSameAuthor ? "rounded-tl-lg" : ""} ${isNextSameAuthor ? "rounded-bl-lg" : "rounded-bl-md"}`
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
                onLoad={handleImageLoad}
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
              isUnplayed={message.id > 0 && !playedVoiceMessageIds.has(message.id)}
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
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#050505]">
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
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
                  <p className="text-sm font-medium opacity-75">{t("call")}</p>
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
                {message.edited_at ? <span>{t("edited")}</span> : null}
                {formatMessageTime(message.created_at)}
                {receiptStatus ? <MessageReceiptIcon className="h-4 w-4" status={receiptStatus} /> : null}
              </span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-5">
              {displayText}
              <span className="ml-2 inline-flex translate-y-[1px] items-center gap-1 align-baseline">
                <span className={`text-[13px] font-medium leading-normal ${isMine ? "text-[#404040]" : "text-[#71717a]"}`}>
                  {message.edited_at ? `${t("edited")} ` : ""}
                  {formatMessageTime(message.created_at)}
                </span>
                {receiptStatus ? (
                  <span
                    aria-label={receiptStatus === "read" ? "Прочитано" : "Доставлено"}
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
                  hasFramedMedia ? "text-[#a1a1aa]" : isMine ? "text-[#404040]" : "text-[#71717a]"
                }`}
              >
                {message.edited_at ? <span>{t("edited")} </span> : null}
                {formatMessageTime(message.created_at)}
              </p>
              {receiptStatus ? (
                <span
                  aria-label={receiptStatus === "read" ? "Прочитано" : "Доставлено"}
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
    return true;
  }
);
