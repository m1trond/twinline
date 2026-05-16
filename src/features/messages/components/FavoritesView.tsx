import type { ChangeEvent, Dispatch, FormEvent, MouseEvent, RefObject, SetStateAction } from "react";
import type { ViewedProfileState } from "@/features/navigation/useNavigationState";
import type { FavoriteItem, MessageRow } from "@/shared/types";
import { FileAttachment } from "@/features/messages/components/FileAttachment";
import { VoiceMessage } from "@/features/messages/components/VoiceMessage";
import { formatAudioTime, formatCallDuration, formatMessageTime } from "@/shared/utils/format";
import {
  getMessageAudioUrl,
  getMessageCallDuration,
  getMessageFilePayload,
  getMessageImageUrl,
  getMessageReply,
  getMessageSticker,
  getMessageVideoUrl,
} from "@/shared/utils/messages";

type FavoritesViewProps = {
  cancelVoiceRecording: () => void;
  editingMessage: MessageRow | null;
  favoriteItems: FavoriteItem[];
  friendProfile: ViewedProfileState | null;
  getReadableMessageText: (text: string) => string;
  handleAttachmentChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
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
  pinnedFavoriteItem: FavoriteItem | null;
  replyTarget: MessageRow | null;
  requestBlockChange: (profileUserId: string, targetLabel: string) => void;
  selectedChatUserId: string | null;
  selectedMessageIdSet: Set<number>;
  sendMessage: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  setEditingMessage: (message: MessageRow | null) => void;
  setMessageText: Dispatch<SetStateAction<string>>;
  setPinnedFavoriteItem: (item: FavoriteItem | null) => void;
  setReplyTarget: (message: MessageRow | null) => void;
  setSelectedImageUrl: (url: string | null) => void;
  stickerButtonRef: RefObject<HTMLButtonElement | null>;
  toggleStickerPicker: () => void;
  toggleVoiceRecording: () => void;
  voiceInputLevel: number;
  voiceRecordingDuration: number;
};

export function FavoritesView({
  cancelVoiceRecording,
  editingMessage,
  favoriteItems,
  friendProfile,
  getReadableMessageText,
  handleAttachmentChange,
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
  pinnedFavoriteItem,
  replyTarget,
  requestBlockChange,
  selectedChatUserId,
  selectedMessageIdSet,
  sendMessage,
  setEditingMessage,
  setMessageText,
  setPinnedFavoriteItem,
  setReplyTarget,
  setSelectedImageUrl,
  stickerButtonRef,
  toggleStickerPicker,
  toggleVoiceRecording,
  voiceInputLevel,
  voiceRecordingDuration,
}: FavoritesViewProps) {
  return (<div className="flex min-h-0 flex-col overflow-hidden">
                <div className="mb-2 flex h-[60px] min-h-[60px] items-center rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
                  <h2 className="text-lg font-medium sm:text-xl">
                    Избранное
                  </h2>
                </div>

                {pinnedFavoriteItem ? (
                  <article className="mb-2 flex shrink-0 items-center gap-2.5 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 px-3 py-2.5 text-left shadow-[0_14px_45px_rgba(0,0,0,0.22)] backdrop-blur-md sm:mb-3 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f4f4f5]/18 text-[#e5e5e5] sm:h-9 sm:w-9 sm:rounded-xl">
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="m14.5 4.5 5 5-3.4 1.1-4.8 4.8.7 3.6-7-7 3.6.7 4.8-4.8 1.1-3.4Z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                        <path
                          d="m9.5 14.5-4 4"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-medium uppercase tracking-[0.16em] text-[#e5e5e5]">
                        Закреплено
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] font-medium text-[#f4f4f5]">
                        {getReadableMessageText(pinnedFavoriteItem.text)}
                      </span>
                    </div>
                    <button
                      className="min-h-9 shrink-0 rounded-lg border border-[#3f3f46]/35 px-2.5 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10 sm:min-h-10 sm:rounded-xl sm:px-4"
                      onClick={() => setPinnedFavoriteItem(null)}
                      type="button"
                    >
                      Открепить
                    </button>
                  </article>
                ) : null}

                <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#050505]/82 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-4">
                  {favoriteItems.length === 0 ? (
                    <div className="grid flex-1 place-items-center text-center">
                      <div className="max-w-sm rounded-2xl border border-dashed border-[#3f3f46]/45 bg-black/20 p-5">
                        <p className="text-sm font-medium">
                          Избранное пока пустое
                        </p>
                        <p className="mt-2 text-[13px] leading-6 text-[#a1a1aa]">
                          Напиши сюда первую заметку или прикрепи файл.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {favoriteItems.map((favoriteItem, favoriteItemIndex) => {
                    const previousFavoriteItem = favoriteItems[favoriteItemIndex - 1];
                    const nextFavoriteItem = favoriteItems[favoriteItemIndex + 1];
                    const isPreviousSameAuthor = previousFavoriteItem?.user_id === favoriteItem.user_id;
                    const isNextSameAuthor = nextFavoriteItem?.user_id === favoriteItem.user_id;
                    const isSelected = selectedMessageIdSet.has(favoriteItem.id);
                    const reply = getMessageReply(favoriteItem.text);
                    const displayText = reply?.body ?? favoriteItem.text;
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
                        className={`-mx-1 flex items-end justify-end gap-1.5 rounded-xl px-1 py-1 transition sm:gap-2 sm:rounded-2xl ${
                          isPreviousSameAuthor ? "mt-1" : "mt-3"
                        }`}
                        key={favoriteItem.id}
                        onContextMenu={(event) => openFavoriteContextMenu(event, favoriteItem)}
                      >
                        <div
                          className={`relative max-w-[min(84vw,92%)] rounded-[18px] sm:max-w-[72%] sm:rounded-[20px] ${
                            hasStandaloneBubble
                              ? "bg-transparent p-0 text-[#f4f4f5] shadow-none"
                              : hasFramedMedia
                                ? "bg-transparent p-0 text-[#f4f4f5] shadow-none"
                              : `bg-[#f4f4f5] text-[#050505] shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
                                  hasAttachment ? "p-1.5 sm:p-2" : "px-3 py-2 sm:px-3.5 sm:py-2.5"
                                } ${isPreviousSameAuthor ? "rounded-tr-lg" : ""} ${
                                  isNextSameAuthor ? "rounded-br-lg" : "rounded-br-md"
                                }`
                          } ${isSelected ? "ring-2 ring-[#f4f4f5]/80" : ""}`}
                        >
                          {reply ? (
                            <div className="hush-reply-preview mb-2 block w-full rounded-xl border-l-4 border-[#050505]/45 bg-[#050505]/12 px-3 py-2 text-left">
                              <p className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-55">
                                {reply.author}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs font-medium opacity-70">
                                {reply.text}
                              </p>
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
                                alt="Избранное изображение"
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
                              isMine
                              sentAt={favoriteItem.created_at}
                              src={audioUrl}
                            />
                          ) : filePayload ? (
                            <FileAttachment file={filePayload} isMine />
                          ) : callDurationSeconds !== null ? (
                            <div className="min-w-[min(230px,70vw)] rounded-xl bg-[#262626] px-3 py-2 text-[#f4f4f5] sm:min-w-[min(260px,70vw)] sm:rounded-2xl">
                              <p className="text-[13px] font-medium opacity-75">
                                Звонок
                              </p>
                              <p className="text-xs font-medium opacity-60">
                                Разговор {formatCallDuration(callDurationSeconds)}
                              </p>
                            </div>
                          ) : sticker ? (
                            <div className="px-1 py-0.5">
                              <span className="block text-6xl leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.25)] sm:text-7xl">
                                {sticker}
                              </span>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words text-[13px] leading-6 sm:text-[15px]">
                              {displayText}
                              <span className="ml-2 inline-flex translate-y-[1px] items-center gap-1 align-baseline">
                                <span className="text-[11px] font-medium leading-none text-[#404040]">
                                  {formatMessageTime(favoriteItem.created_at)}
                                </span>
                              </span>
                            </p>
                          )}

                          {!hasStandaloneBubble && hasAttachment ? (
                            <div className="mt-2 flex items-center justify-end gap-3 px-1">
                              <p className={`text-right text-[11px] font-medium ${hasFramedMedia ? "text-[#a1a1aa]" : "text-[#404040]"}`}>
                                {formatMessageTime(favoriteItem.created_at)}
                              </p>
                            </div>
                          ) : null}
                        </div>

                      </article>
                    );
                  })}
                </div>

                {isSelectedChatBlocked ? (
                  <div className="mt-2 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl">
                    {isSelectedChatBlockedByMe ? (
                      <button
                        className="min-h-11 w-full rounded-lg bg-[#f4f4f5] px-4 text-[13px] font-medium text-[#050505] transition hover:bg-[#e5e5e5] sm:rounded-xl"
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
                        Разблокировать
                      </button>
                    ) : (
                      <div className="flex min-h-11 items-center justify-center rounded-lg bg-[#f4f4f5]/12 px-4 text-[13px] font-medium text-[#a1a1aa] sm:rounded-xl">
                        Вы были заблокированы
                      </div>
                    )}
                  </div>
                ) : !isPinnedMessagesViewOpen ? (
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
                    <div className="relative col-span-3 flex min-h-10 min-w-0 flex-1 items-center rounded-lg border border-red-400/35 bg-red-500/10 px-3 text-[13px] text-[#f4f4f5] sm:col-span-1">
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
                        aria-label="Текст избранного"
                        className="min-h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm text-[#f4f4f5] outline-none transition placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] focus:bg-[#f4f4f5]/18 sm:px-4 sm:text-[13px]"
                        onChange={handleMessageTextChange}
                        placeholder={
                          editingMessage
                            ? "Измени сообщение..."
                            : replyTarget
                              ? "Ответь на сообщение..."
                              : "Напиши в избранное..."
                        }
                        ref={messageInputRef}
                        type="text"
                        value={messageText}
                      />
                      <button
                        aria-label="Стикеры"
                        className="grid min-h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/12 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/18 disabled:cursor-not-allowed disabled:opacity-50"
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
                    aria-label={isRecordingVoice ? "Отправить голосовое" : "Записать голосовое"}
                    className={`relative grid min-h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border text-[#f4f4f5] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isRecordingVoice
                        ? "border-red-400/60 bg-red-500/85 text-white hover:bg-red-400"
                        : "border-[#3f3f46]/35 bg-[#f4f4f5]/12 hover:bg-[#f4f4f5]/18"
                    }`}
                    disabled={isUploadingAttachment}
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
                ) : null}

                {replyTarget || editingMessage ? (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#3f3f46]/35 bg-[#111111]/82 px-3 py-2.5 text-[13px] shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-md sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
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
              </div>
  );
}
