import type { MouseEvent } from "react";
import type { TranslationKey } from "@/shared/i18n";
import type { FavoriteItem, ProfileRow } from "@/shared/types";
import type { ViewedProfileState } from "@/features/navigation/useNavigationState";
import { FileAttachment } from "@/features/messages/components/FileAttachment";
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

type FavoriteMessageBubbleProps = {
  favoriteItem: FavoriteItem;
  previousFavoriteItem: FavoriteItem | undefined;
  nextFavoriteItem: FavoriteItem | undefined;
  currentProfile: ProfileRow | null;
  currentUserId: string | null;
  profilesByUserId: Map<string, ProfileRow>;
  selectedMessageIdSet: Set<number>;
  isFavoriteSelectionMode: boolean;
  handleFavoriteSelectionClick: (event: MouseEvent<HTMLElement>, favoriteItem: FavoriteItem) => void;
  openFavoriteContextMenu: (event: MouseEvent<HTMLElement>, favoriteItem: FavoriteItem) => void;
  setViewedProfile: (profile: ViewedProfileState | null) => void;
  setSelectedImageUrl: (url: string | null) => void;
  t: (key: TranslationKey) => string;
  language: string;
};

export function FavoriteMessageBubble({
  favoriteItem,
  previousFavoriteItem,
  nextFavoriteItem,
  currentProfile,
  currentUserId,
  profilesByUserId,
  selectedMessageIdSet,
  isFavoriteSelectionMode,
  handleFavoriteSelectionClick,
  openFavoriteContextMenu,
  setViewedProfile,
  setSelectedImageUrl,
  t,
  language,
}: FavoriteMessageBubbleProps) {
  const isPreviousSameAuthor = previousFavoriteItem?.user_id === favoriteItem.user_id;
  const isNextSameAuthor = nextFavoriteItem?.user_id === favoriteItem.user_id;
  const isSelected = selectedMessageIdSet.has(favoriteItem.id);
  const reply = getMessageReply(favoriteItem.text);
  const rawDisplayText = reply?.body ?? favoriteItem.text;
  const forwarded = getMessageForward(rawDisplayText);
  const forwardedProfile = forwarded?.authorUserId
    ? forwarded.authorUserId === currentProfile?.user_id
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
  const shouldShowOwnAvatar = !isNextSameAuthor;

  return (
    <article
      className={`-mx-1 flex items-end justify-end gap-1.5 rounded-xl px-1 py-1 transition sm:gap-2 sm:rounded-2xl ${
        isPreviousSameAuthor ? "mt-1" : "mt-3"
      } ${isSelected ? "bg-[#f4f4f5]/8 shadow-[0_0_0_1px_rgba(244,244,245,0.12)]" : ""}`}
      data-message-id={favoriteItem.id}
      onClickCapture={(event) => handleFavoriteSelectionClick(event, favoriteItem)}
      onContextMenu={(event) => openFavoriteContextMenu(event, favoriteItem)}
    >
      {isFavoriteSelectionMode ? (
        <span
          className={`mb-1 grid h-6 w-6 shrink-0 place-items-center transition ${
            isSelected ? "text-[#f4f4f5]" : "text-transparent"
          }`}
        >
          <MessageCircleCheckIcon />
        </span>
      ) : null}
      <div
        className={`relative max-w-[min(84vw,92%)] rounded-xl sm:max-w-[72%] sm:rounded-xl ${
          hasStandaloneBubble
            ? "bg-transparent p-0 text-[#f4f4f5] shadow-none"
            : hasFramedMedia
              ? "bg-transparent p-0 text-[#f4f4f5] shadow-none"
            : `bg-[#f4f4f5] text-[#050505] shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
                hasAttachment ? "p-1.5" : "px-3 py-1.5 sm:px-3 sm:py-1.5"
              } ${isPreviousSameAuthor ? "rounded-tr-lg" : ""} ${
                isNextSameAuthor ? "rounded-br-lg" : "rounded-br-md"
              }`
        } ${isSelected ? "ring-2 ring-[#f4f4f5]/80" : ""}`}
      >
        {reply ? (
          <div className="hush-reply-preview mb-2 block w-full rounded-xl border-l-4 border-[#050505]/45 bg-[#050505]/12 px-3 py-2 text-left">
            <p className="text-xs font-medium uppercase tracking-[0.12em] opacity-55">
              {reply.author}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs font-medium opacity-70">
              {reply.text}
            </p>
          </div>
        ) : null}

        {forwarded ? (
          <div className={`mb-1.5 flex items-center gap-2 px-0.5 text-left ${!hasStandaloneBubble && !hasFramedMedia ? "text-[#050505]" : "text-[#f4f4f5]"}`}>
            <button
              aria-label={forwardedName}
              className={`hush-avatar grid h-7 min-h-7 w-7 min-w-7 shrink-0 aspect-square place-items-center overflow-hidden rounded-full text-xs font-medium leading-normal transition ${!hasStandaloneBubble && !hasFramedMedia ? "bg-[#050505] text-[#f4f4f5]" : "bg-[#f4f4f5] text-[#050505]"}`}
              disabled={!forwarded.authorUserId}
              onClick={() => {
                if (!forwarded.authorUserId) {
                  return;
                }

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
               <p className={`truncate text-xs font-medium leading-normal ${!hasStandaloneBubble && !hasFramedMedia ? "text-[#52525b]" : "text-[#a1a1aa]"}`}>
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
            onClick={() => setSelectedImageUrl(imageUrl)}
            type="button"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={t("favoriteImage")}
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
            editedAt={favoriteItem.edited_at ?? null}
            isMine
            sentAt={favoriteItem.created_at}
            src={audioUrl}
          />
        ) : filePayload ? (
          <FileAttachment
            editedAt={favoriteItem.edited_at ?? null}
            file={filePayload}
            isMine
          />
        ) : callDurationSeconds !== null ? (
          <div className="min-w-[min(230px,70vw)] rounded-xl bg-[#262626] px-3 py-2 text-[#f4f4f5] sm:min-w-[min(260px,70vw)] sm:rounded-xl">
            <p className="text-sm font-medium opacity-75">
              {t("call")}
            </p>
            <p className="text-xs font-medium opacity-60">
              {t("callConversation")} {formatCallDuration(callDurationSeconds)}
            </p>
          </div>
        ) : sticker ? (
          <div className="px-1 py-0.5">
            <span className="block text-6xl leading-normal drop-shadow-[0_10px_20px_rgba(0,0,0,0.25)] sm:text-7xl">
              {sticker}
            </span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-5">
            {displayText}
            <span className="ml-2 inline-flex translate-y-[1px] items-center gap-1 align-baseline">
              <span className="text-xs font-medium leading-normal text-[#404040]">
                {favoriteItem.edited_at ? `${t("edited")} ` : ""}
                {formatMessageTime(favoriteItem.created_at)}
              </span>
            </span>
          </p>
        )}

        {hasCaptionableAttachment && attachmentCaption ? (
          <p className="mt-1.5 max-w-[min(320px,70vw)] whitespace-pre-wrap break-words px-1 text-sm leading-5 text-[#f4f4f5]">
            {attachmentCaption}
          </p>
        ) : null}

        {!hasStandaloneBubble && hasAttachment ? (
          <div className="mt-2 flex items-center justify-end gap-3 px-1">
            <p className={`text-right text-xs font-medium ${hasFramedMedia ? "text-[#a1a1aa]" : "text-[#404040]"}`}>
              {favoriteItem.edited_at ? (
                <span>{t("edited")} </span>
              ) : null}
              {formatMessageTime(favoriteItem.created_at)}
            </p>
          </div>
        ) : null}
      </div>
      {shouldShowOwnAvatar ? (
        <button
          className="hush-avatar grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-xs font-medium text-[#050505] transition sm:h-8 sm:w-8 sm:text-xs"
          onClick={() =>
            setViewedProfile({
              avatarUrl: currentProfile?.avatar_url ?? null,
              bio: currentProfile?.bio ?? null,
              name: currentProfile?.display_name ?? favoriteItem.author,
              username: currentProfile?.username ?? null,
              updatedAt: currentProfile?.updated_at ?? null,
              userId: currentUserId,
            })
          }
          type="button"
        >
          {currentProfile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={t("avatarAlt")}
              className="h-full w-full object-cover"
              src={currentProfile.avatar_url}
            />
          ) : (
            (currentProfile?.display_name ?? favoriteItem.author)[0]?.toUpperCase()
          )}
        </button>
      ) : (
        <span className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
      )}
    </article>
  );
}

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
