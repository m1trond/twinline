import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useI18n } from "@/shared/i18n-context";
import type { MessageRow, ProfileRow } from "@/shared/types";

type ChatDeleteTargetProfile = {
  name: string;
  username: string | null;
  userId: string;
};

type MessagePinDialogProps = {
  activePinnedMessageIdSet: Set<number>;
  confirmPinnedMessage: () => void;
  confirmUnpinPinnedMessage: () => void;
  getReadableMessageText: (text: string) => string;
  messagePinTarget: MessageRow | null;
  setMessagePinTarget: (message: MessageRow | null) => void;
  setShouldPinForBoth: Dispatch<SetStateAction<boolean>>;
  shouldPinForBoth: boolean;
};

type MessageDeleteDialogProps = {
  deleteMessage: (message: MessageRow) => void;
  getReadableMessageText: (text: string) => string;
  hideMessageForMe: (message: MessageRow) => void;
  messageDeleteTarget: MessageRow | null;
  setMessageDeleteTarget: (message: MessageRow | null) => void;
};

type SelectedMessagesDeleteDialogProps = {
  deleteSelectedMessagesForBoth: () => void;
  getReadableMessageText: (text: string) => string;
  hideSelectedMessagesForMe: () => void;
  isOpen: boolean;
  selectedDialogMessages: MessageRow[];
  setIsSelectedDeleteDialogOpen: (isOpen: boolean) => void;
};

type ChatDeleteDialogProps = {
  chatDeleteTargetProfile: ChatDeleteTargetProfile | null;
  confirmDeleteChat: () => void;
  isDeletingChat: boolean;
  isOpen: boolean;
  onClose: () => void;
};

type UnpinAllDialogProps = {
  isOpen: boolean;
  messageCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

type ForwardMessagesDialogProps = {
  chatProfiles: ProfileRow[];
  isForwarding: boolean;
  isOpen: boolean;
  onClose: () => void;
  onForward: (profile: ProfileRow) => void;
  profiles: ProfileRow[];
  selectedMessages: MessageRow[];
  userId: string | undefined;
};

function DeleteIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ForwardMessagesDialog({
  chatProfiles,
  isForwarding,
  isOpen,
  onClose,
  onForward,
  profiles,
  selectedMessages,
  userId,
}: ForwardMessagesDialogProps) {
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().replace(/^@+/, "").toLowerCase();

  const dialogProfileIds = useMemo(
    () => new Set(chatProfiles.map((profile) => profile.user_id)),
    [chatProfiles],
  );
  const searchProfiles = useMemo(() => {
    if (normalizedQuery.length < 2) {
      return [];
    }

    return profiles
      .filter((profile) => {
        if (profile.user_id === userId || dialogProfileIds.has(profile.user_id)) {
          return false;
        }

        const username = profile.username?.toLowerCase() ?? "";
        const displayName = profile.display_name.toLowerCase();

        return username.includes(normalizedQuery) || displayName.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [dialogProfileIds, normalizedQuery, profiles, userId]);
  const visibleProfiles = normalizedQuery.length >= 2
    ? [...chatProfiles, ...searchProfiles]
    : chatProfiles;

  if (!isOpen || selectedMessages.length === 0) {
    return null;
  }

  function closeDialog() {
    setQuery("");
    onClose();
  }

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
        onClick={closeDialog}
        type="button"
      />
      <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[96] flex max-h-[min(620px,calc(100dvh-24px))] w-[min(440px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:rounded-3xl sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-medium text-[#f4f4f5]">
              {language === "en" ? "Forward messages" : "Переслать сообщения"}
            </h2>
            <p className="mt-1 text-sm text-[#a1a1aa]">
              {selectedMessages.length} {language === "en" ? "selected" : "выбрано"}
            </p>
          </div>
          <button
            className="min-h-11 shrink-0 rounded-xl border border-[#3f3f46]/35 px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={closeDialog}
            type="button"
          >
            {t("cancel")}
          </button>
        </div>
        <input
          autoFocus
          className="mb-3 min-h-10 rounded-xl border border-[#3f3f46]/35 bg-[#f4f4f5]/10 px-3 text-sm text-[#f4f4f5] outline-none transition placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5]/70 focus:bg-[#f4f4f5]/14"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={language === "en" ? "Find by @username" : "Найди человека по @нику"}
          type="text"
          value={query}
        />
        <div className="min-h-0 overflow-y-auto pr-1">
          {visibleProfiles.length > 0 ? (
            <div className="grid gap-1.5">
              {visibleProfiles.map((profile) => (
                <button
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-2.5 text-left transition hover:border-[#3f3f46]/45 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isForwarding}
                  key={profile.user_id}
                  onClick={() => {
                    setQuery("");
                    onForward(profile);
                  }}
                  type="button"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-sm font-medium text-[#050505]">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={language === "en" ? "Avatar" : "Аватар"}
                        className="h-full w-full object-cover"
                        src={profile.avatar_url}
                      />
                    ) : (
                      profile.display_name[0]?.toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[#f4f4f5]">
                      {profile.display_name}
                    </span>
                    <span className="block truncate text-xs text-[#a1a1aa]">
                      {profile.username ? `@${profile.username}` : "@ник не задан"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-[#3f3f46]/45 px-3 py-5 text-center text-sm text-[#a1a1aa]">
              {normalizedQuery.length >= 2
                ? language === "en" ? "No users found." : "Пользователь не найден."
                : language === "en" ? "No dialogs yet." : "Диалогов пока нет."}
            </p>
          )}
        </div>
      </section>
    </>
  );
}

export function MessagePinDialog({
  activePinnedMessageIdSet,
  confirmPinnedMessage,
  confirmUnpinPinnedMessage,
  getReadableMessageText,
  messagePinTarget,
  setMessagePinTarget,
  setShouldPinForBoth,
  shouldPinForBoth,
}: MessagePinDialogProps) {
  const { language, t } = useI18n();

  if (!messagePinTarget) {
    return null;
  }

  const isPinned = activePinnedMessageIdSet.has(messagePinTarget.id);

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
        onClick={() => setMessagePinTarget(null)}
        type="button"
      />
      <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(448px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:w-[min(448px,calc(100vw-32px))] sm:rounded-3xl sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f4f4f5]/14 text-[#f4f4f5]">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path
                d="M12 17v5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-medium text-[#f4f4f5]">
              {isPinned
                ? language === "en" ? "Unpin message?" : "Открепить сообщение?"
                : language === "en" ? "Pin message?" : "Закрепить сообщение?"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#a1a1aa]">
              {isPinned
                ? language === "en" ? "The message will disappear from the pinned area in this chat." : "Сообщение исчезнет из закрепа в этом чате."
                : language === "en" ? "The message will be visible at the top of the chat." : "Сообщение будет видно сверху переписки."}
            </p>
          </div>
        </div>

        {!isPinned ? (
          <>
            <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/20 p-3">
              <p className="line-clamp-3 text-sm font-medium text-[#f4f4f5]">
                {getReadableMessageText(messagePinTarget.text)}
              </p>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-[#3f3f46]/35 bg-[#f4f4f5]/8 p-3 text-sm font-medium text-[#f4f4f5]">
              <input
                checked={shouldPinForBoth}
                className="h-5 w-5 accent-[#f4f4f5]"
                onChange={(event) => setShouldPinForBoth(event.target.checked)}
                type="checkbox"
              />
              <span>{language === "en" ? "Pin for both" : "Закрепить для двоих"}</span>
            </label>
          </>
        ) : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-11 rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
            onClick={isPinned ? confirmUnpinPinnedMessage : confirmPinnedMessage}
            type="button"
          >
            {isPinned ? t("yes") : t("pin")}
          </button>
          <button
            className="min-h-11 rounded-xl border border-[#3f3f46]/35 px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={() => setMessagePinTarget(null)}
            type="button"
          >
            {isPinned ? t("no") : t("cancel")}
          </button>
        </div>
      </section>
    </>
  );
}

export function MessageDeleteDialog({
  deleteMessage,
  getReadableMessageText,
  hideMessageForMe,
  messageDeleteTarget,
  setMessageDeleteTarget,
}: MessageDeleteDialogProps) {
  const { language, t } = useI18n();

  if (!messageDeleteTarget) {
    return null;
  }

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
        onClick={() => setMessageDeleteTarget(null)}
        type="button"
      />
      <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(448px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:w-[min(448px,calc(100vw-32px))] sm:rounded-3xl sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#3f3f46]/45 bg-[#f4f4f5]/10 text-[#f4f4f5]">
            <DeleteIcon />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-medium text-[#f4f4f5]">
              {language === "en" ? "Delete message" : "Удаление сообщения"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#a1a1aa]">
              {language === "en"
                ? "Choose whether to delete the message only for you or for both chat participants."
                : "Выберите, удалить сообщение только у себя или у обоих участников переписки."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/20 p-3">
          <p className="line-clamp-3 text-sm font-medium text-[#f4f4f5]">
            {getReadableMessageText(messageDeleteTarget.text)}
          </p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-11 rounded-xl border border-[#3f3f46]/35 px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={() => hideMessageForMe(messageDeleteTarget)}
            type="button"
          >
            {language === "en" ? "Only for me" : "Только у себя"}
          </button>
          <button
            className="min-h-11 rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
            onClick={() => deleteMessage(messageDeleteTarget)}
            type="button"
          >
            {language === "en" ? "For both" : "У обоих"}
          </button>
        </div>

        <button
          className="mt-3 min-h-11 w-full rounded-xl px-4 text-sm font-medium text-[#a1a1aa] transition hover:bg-white/10 hover:text-[#f4f4f5]"
          onClick={() => setMessageDeleteTarget(null)}
          type="button"
        >
          {t("cancel")}
        </button>
      </section>
    </>
  );
}

export function SelectedMessagesDeleteDialog({
  deleteSelectedMessagesForBoth,
  getReadableMessageText,
  hideSelectedMessagesForMe,
  isOpen,
  selectedDialogMessages,
  setIsSelectedDeleteDialogOpen,
}: SelectedMessagesDeleteDialogProps) {
  const { language, t } = useI18n();

  if (!isOpen || selectedDialogMessages.length === 0) {
    return null;
  }

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
        onClick={() => setIsSelectedDeleteDialogOpen(false)}
        type="button"
      />
      <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(448px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:w-[min(448px,calc(100vw-32px))] sm:rounded-3xl sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#3f3f46]/45 bg-[#f4f4f5]/10 text-[#f4f4f5]">
            <DeleteIcon />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-medium text-[#f4f4f5]">
              {language === "en" ? "Delete messages" : "Удаление сообщений"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#a1a1aa]">
              {language === "en"
                ? "Choose whether to delete selected messages only for you or for both chat participants."
                : "Выбери, удалить выделенные только у себя или у обоих участников переписки."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/20 p-3">
          <p className="text-sm font-medium text-[#f4f4f5]">
            {selectedDialogMessages.length} {language === "en" ? "messages" : "сообщ."}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-[#a1a1aa]">
            {getReadableMessageText(selectedDialogMessages.at(-1)?.text ?? "")}
          </p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-11 rounded-xl border border-[#3f3f46]/35 px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={hideSelectedMessagesForMe}
            type="button"
          >
            {language === "en" ? "Only for me" : "Только у себя"}
          </button>
          <button
            className="min-h-11 rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
            onClick={deleteSelectedMessagesForBoth}
            type="button"
          >
            {language === "en" ? "For both" : "У обоих"}
          </button>
        </div>

        <button
          className="mt-3 min-h-11 w-full rounded-xl px-4 text-sm font-medium text-[#a1a1aa] transition hover:bg-white/10 hover:text-[#f4f4f5]"
          onClick={() => setIsSelectedDeleteDialogOpen(false)}
          type="button"
        >
          {t("cancel")}
        </button>
      </section>
    </>
  );
}

export function ChatDeleteDialog({
  chatDeleteTargetProfile,
  confirmDeleteChat,
  isDeletingChat,
  isOpen,
  onClose,
}: ChatDeleteDialogProps) {
  const { language, t } = useI18n();

  if (!isOpen) {
    return null;
  }

  const chatDeleteTargetLabel = chatDeleteTargetProfile?.username
    ? `@${chatDeleteTargetProfile.username}`
    : chatDeleteTargetProfile?.name ?? (language === "en" ? "this chat" : "этим пользователем");

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[95] bg-black/62 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[96] w-[min(460px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 text-left shadow-[0_24px_90px_rgba(0,0,0,0.65)] sm:rounded-3xl sm:p-5">
        <div className="relative">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#3f3f46]/45 bg-[#f4f4f5]/10 text-[#f4f4f5]">
              <DeleteIcon />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-medium text-[#f4f4f5]">
                {language === "en" ? "Delete chat for both?" : "Удалить чат у двоих?"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
                {language === "en"
                  ? `Are you sure you want to delete the conversation with ${chatDeleteTargetLabel}?`
                  : `Вы уверены что хотите удалить переписку с ${chatDeleteTargetLabel}?`}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/24 p-3">
            <p className="text-sm font-medium text-[#f4f4f5]">
              {chatDeleteTargetProfile?.name
                ? `${t("chatWith")} ${chatDeleteTargetProfile.name}`
                : language === "en" ? "Current chat" : "Текущий чат"}
            </p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              className="min-h-11 rounded-xl border border-[#3f3f46]/35 px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              {language === "en" ? "Keep" : "Оставить"}
            </button>
            <button
              className="min-h-11 rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeletingChat}
              onClick={confirmDeleteChat}
              type="button"
            >
              {isDeletingChat
                ? language === "en" ? "Deleting..." : "Удаляю..."
                : language === "en" ? "Delete for both" : "Удалить у двоих"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export function UnpinAllDialog({
  isOpen,
  messageCount,
  onCancel,
  onConfirm,
}: UnpinAllDialogProps) {
  const { language, t } = useI18n();

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
        onClick={onCancel}
        type="button"
      />
      <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[96] w-[min(440px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:rounded-3xl sm:p-5">
        <div className="relative">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#3f3f46]/45 bg-[#f4f4f5]/10 text-[#f4f4f5]">
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path
                  d="M12 17v5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path
                  d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-medium text-[#f4f4f5]">
                {language === "en" ? "Unpin all pinned messages?" : "Открепить все закрепы?"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#a1a1aa]">
                {language === "en"
                  ? "Pinned messages will disappear from this chat list. Shared pins will be unpinned for both."
                  : "Закрепы исчезнут из списка этого чата. Общие закрепы открепятся для обоих."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/22 px-3 py-2.5">
            <p className="text-sm font-medium text-[#f4f4f5]">
              {messageCount} {language === "en" ? "messages" : "сообщ."}
            </p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              className="min-h-11 rounded-xl border border-[#3f3f46]/35 px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
              onClick={onCancel}
              type="button"
            >
              {language === "en" ? "Keep" : "Оставить"}
            </button>
            <button
              className="min-h-11 rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
              onClick={onConfirm}
              type="button"
            >
              {t("unpin")}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
